import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { timingSafeEqual } from "node:crypto";
import {
  SocialConnectionStatusCode,
  SocialPlatformCode,
} from "@nakliyeborsasi/core";
import { CompanySocialConnectionEntity } from "../../../infrastructure/database/entities/CompanySocialConnectionEntity";
import { SocialHubMessagingBridgeService } from "../SocialHubMessagingBridgeService";
import { SocialHubWebhookBridgeAuditService } from "../SocialHubWebhookBridgeAuditService";
import { parseSocialHubConnectionMetadata } from "./SocialHubConnectionMetadata";
import {
  parseTelegramInboundMessage,
  type TelegramInboundMessage,
} from "./socialHubTelegramWebhookParser";
import { SocialHubTokenVaultService } from "./SocialHubTokenVaultService";
import { SocialHubTelegramFileService } from "./SocialHubTelegramFileService";
import { SocialHubTelegramMediaGroupBufferService } from "./SocialHubTelegramMediaGroupBufferService";
import type { TelegramMediaGroupBufferState } from "./socialHubTelegramMediaGroupTypes";
import { resolveTelegramDiscussionRouting } from "./socialHubTelegramDiscussionRouting";
import type { SocialHubConnectionMetadata } from "./SocialHubConnectionMetadata";

@Injectable()
export class SocialHubTelegramWebhookIngestService {
  private readonly logger = new Logger(SocialHubTelegramWebhookIngestService.name);

  public constructor(
    @InjectRepository(CompanySocialConnectionEntity)
    private readonly connectionRepository: Repository<CompanySocialConnectionEntity>,
    private readonly messagingBridgeService: SocialHubMessagingBridgeService,
    private readonly webhookBridgeAuditService: SocialHubWebhookBridgeAuditService,
    private readonly tokenVault: SocialHubTokenVaultService,
    private readonly telegramFileService: SocialHubTelegramFileService,
    private readonly mediaGroupBufferService: SocialHubTelegramMediaGroupBufferService,
  ) {}

  public async ingestPayload(params: {
    connectionId: string;
    secretTokenHeader: string | undefined;
    body: Record<string, unknown>;
  }): Promise<void> {
    const connection = await this.connectionRepository.findOne({
      where: { id: params.connectionId.trim() },
    });
    if (
      !connection ||
      connection.platformCode !== SocialPlatformCode.Telegram ||
      connection.statusCode !== SocialConnectionStatusCode.Connected
    ) {
      this.logger.warn(
        `Telegram webhook: unknown or inactive connection id=${params.connectionId}`,
      );
      return;
    }
    const metadata = parseSocialHubConnectionMetadata(connection.grantedScopes);
    const expectedSecret = metadata.telegramWebhookSecret?.trim() ?? "";
    if (expectedSecret) {
      const provided = params.secretTokenHeader?.trim() ?? "";
      if (!this.secretsMatch(expectedSecret, provided)) {
        this.logger.warn(
          `Telegram webhook: secret mismatch connection=${connection.id}`,
        );
        return;
      }
    }

    const parsedRaw = parseTelegramInboundMessage(params.body);
    if (!parsedRaw) {
      return;
    }
    const parsed = this.applyDiscussionRouting(parsedRaw, metadata);

    if (parsed.isEdit) {
      if (parsed.mediaGroupId) {
        this.logger.debug(
          `Telegram album edit skipped connection=${connection.id} group=${parsed.mediaGroupId}`,
        );
        return;
      }
      const editResult = await this.messagingBridgeService.ingestWebhookInboundEdit(
        {
          companyId: connection.companyId,
          platformCode: SocialPlatformCode.Telegram,
          externalThreadId: parsed.externalThreadId,
          displayLabel: parsed.displayLabel,
          bodyText: parsed.bodyText,
          externalMessageId: parsed.externalMessageId,
        },
      );
      if (editResult.ingested && editResult.threadId) {
        this.webhookBridgeAuditService.recordInboundBridged({
          companyId: connection.companyId,
          platformCode: SocialPlatformCode.Telegram,
          threadId: editResult.threadId,
          externalThreadId: parsed.externalThreadId,
          externalMessageId: `edit:${parsed.externalMessageId}`,
        });
      }
      return;
    }

    if (parsed.mediaGroupId) {
      await this.mediaGroupBufferService.enqueue(
        {
          connectionId: connection.id,
          companyId: connection.companyId,
          mediaGroupId: parsed.mediaGroupId,
          chatId: parsed.chatId,
          externalThreadId: parsed.externalThreadId,
          displayLabel: parsed.displayLabel,
          bodyText: parsed.bodyText,
          media: parsed.media,
          externalMessageId: parsed.externalMessageId,
        },
        async (merged) => {
          await this.ingestMerged(connection.companyId, merged);
        },
      );
      return;
    }

    await this.ingestSingle(connection.companyId, parsed);
  }

  private applyDiscussionRouting(
    parsed: TelegramInboundMessage,
    metadata: SocialHubConnectionMetadata,
  ): TelegramInboundMessage {
    const routing = resolveTelegramDiscussionRouting({
      chatId: parsed.chatId,
      discussionGroupChatId: metadata.telegramDiscussionGroupChatId,
      senderDisplayLabel: parsed.displayLabel.replace(/^Kanal yorumu · /, ""),
      message: parsed.rawMessage,
    });
    return {
      ...parsed,
      externalThreadId: routing.externalThreadId,
      displayLabel: routing.displayLabel,
    };
  }

  private async ingestMerged(
    companyId: string,
    merged: TelegramMediaGroupBufferState,
  ): Promise<void> {
    const synthetic: TelegramInboundMessage = {
      chatId: merged.chatId,
      externalThreadId: merged.externalThreadId,
      displayLabel: merged.displayLabel,
      bodyText: merged.bodyText,
      externalMessageId: `album:${merged.mediaGroupId}`,
      media: merged.media,
      mediaGroupId: merged.mediaGroupId,
      rawMessage: {},
    };
    await this.ingestSingle(companyId, synthetic);
  }

  private async ingestSingle(
    companyId: string,
    parsed: TelegramInboundMessage,
  ): Promise<void> {
    let attachmentsInput:
      | Awaited<
          ReturnType<SocialHubTelegramFileService["downloadMediaAsAttachments"]>
        >
      | undefined;
    if (parsed.media.length > 0) {
      const botToken = await this.tokenVault.getAccessToken(
        companyId,
        SocialPlatformCode.Telegram,
      );
      if (botToken) {
        attachmentsInput = await this.telegramFileService.downloadMediaAsAttachments(
          botToken,
          parsed.media,
        );
      }
    }

    const result = await this.messagingBridgeService.ingestWebhookInbound({
      companyId,
      platformCode: SocialPlatformCode.Telegram,
      externalThreadId: parsed.externalThreadId,
      displayLabel: parsed.displayLabel,
      bodyText: parsed.bodyText,
      externalMessageId: parsed.externalMessageId,
      attachmentsInput:
        attachmentsInput && attachmentsInput.length > 0
          ? attachmentsInput
          : undefined,
    });
    if (result.ingested) {
      this.logger.log(
        `Telegram message bridged company=${companyId} thread=${result.threadId}`,
      );
      this.webhookBridgeAuditService.recordInboundBridged({
        companyId,
        platformCode: SocialPlatformCode.Telegram,
        threadId: result.threadId,
        externalThreadId: parsed.externalThreadId,
        externalMessageId: parsed.externalMessageId,
      });
    }
  }

  private secretsMatch(expected: string, provided: string): boolean {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(provided, "utf8");
    if (a.length !== b.length) {
      return false;
    }
    return timingSafeEqual(a, b);
  }
}
