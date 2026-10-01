import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { createHash, randomUUID } from "node:crypto";
import { In, Repository } from "typeorm";
import {
  AuthenticatedUserContext,
  DEFAULT_LOCALE,
  SocialPlatformCode,
  ValidationException,
} from "@nakliyeborsasi/core";
import { labelSocialPlatform } from "./socialHubPlatformLabels";
import { CompanySocialThreadLinkEntity } from "../../infrastructure/database/entities/CompanySocialThreadLinkEntity";
import { MessageThreadEntity } from "../../infrastructure/database/entities/MessageThreadEntity";
import { MessagingThreadApplicationService } from "../messaging/MessagingThreadApplicationService";
import {
  buildSocialInboxThreadDeepLink,
  type SocialHubInboxThreadPreviewRow,
} from "./socialHubInboxThreadPreview";

const PLATFORM_LABELS: Record<SocialPlatformCode, string> = {
  [SocialPlatformCode.Instagram]: "Instagram",
  [SocialPlatformCode.FacebookMessenger]: "Facebook Messenger",
  [SocialPlatformCode.WhatsAppCloud]: "WhatsApp",
  [SocialPlatformCode.LinkedIn]: "LinkedIn",
};

@Injectable()
export class SocialHubMessagingBridgeService {
  public constructor(
    @InjectRepository(CompanySocialThreadLinkEntity)
    private readonly linkRepository: Repository<CompanySocialThreadLinkEntity>,
    @InjectRepository(MessageThreadEntity)
    private readonly messageThreadRepository: Repository<MessageThreadEntity>,
    private readonly messagingThreadApplicationService: MessagingThreadApplicationService,
  ) {}

  public async ensureExternalThread(params: {
    companyId: string;
    platformCode: SocialPlatformCode | string;
    externalThreadId: string;
    displayLabel: string;
  }): Promise<CompanySocialThreadLinkEntity> {
    const existing = await this.linkRepository.findOne({
      where: {
        companyId: params.companyId,
        platformCode: params.platformCode,
        externalThreadId: params.externalThreadId,
      },
    });
    if (existing) {
      return existing;
    }
    const virtualCounterpartyId = randomUUID();
    const platformLabel =
      PLATFORM_LABELS[params.platformCode as SocialPlatformCode] ??
      labelSocialPlatform(String(params.platformCode));
    const thread = await this.messageThreadRepository.save(
      this.messageThreadRepository.create({
        companyAId: params.companyId,
        companyBId: virtualCounterpartyId,
        freightListingId: null,
        threadKind: "external_social",
        title: `${platformLabel} · ${params.displayLabel}`,
        legalHoldAt: null,
      }),
    );
    return this.linkRepository.save(
      this.linkRepository.create({
        companyId: params.companyId,
        platformCode: params.platformCode,
        externalThreadId: params.externalThreadId,
        messageThreadId: thread.id,
        virtualCounterpartyId,
        displayLabel: params.displayLabel,
        isOpen: true,
        lastInboundAt: null,
      }),
    );
  }

  public async ingestInboundMessage(
    companyId: string,
    linkId: string,
    bodyText: string,
  ): Promise<{ messageId: string; threadId: string }> {
    const link = await this.linkRepository.findOne({
      where: { id: linkId, companyId },
    });
    if (!link || !link.isOpen) {
      throw new ValidationException("Sosyal konuşma bulunamadı veya kapalı.");
    }
    const trimmed = bodyText.trim();
    if (!trimmed) {
      throw new ValidationException("Mesaj metni gerekli.");
    }
    const message =
      await this.messagingThreadApplicationService.recordExternalChannelInbound({
        companyId,
        threadId: link.messageThreadId,
        bodyText: trimmed,
        senderDisplayName: link.displayLabel,
      });
    link.lastInboundAt = new Date();
    await this.linkRepository.save(link);
    return { messageId: message.id, threadId: link.messageThreadId };
  }

  public async listInboxThreadsPreview(
    user: AuthenticatedUserContext,
    limit = 10,
  ): Promise<{ threads: SocialHubInboxThreadPreviewRow[] }> {
    const capped = Math.min(Math.max(limit, 1), 20);
    const listed = await this.messagingThreadApplicationService.listThreads(
      user,
      DEFAULT_LOCALE,
    );
    const socialThreads = listed
      .filter((thread) => thread.threadKind === "external_social")
      .slice(0, capped);
    const threadIds = socialThreads.map((thread) => thread.threadId);
    const links =
      threadIds.length > 0
        ? await this.linkRepository.find({
            where: {
              companyId: user.companyId,
              messageThreadId: In(threadIds),
            },
          })
        : [];
    const openByThreadId = new Map(
      links.map((link) => [link.messageThreadId, link.isOpen]),
    );
    const displayByThreadId = new Map(
      links.map((link) => [link.messageThreadId, link.displayLabel]),
    );
    const threads: SocialHubInboxThreadPreviewRow[] = socialThreads.map(
      (thread) => {
        const platformCode = thread.externalChannelCode ?? "UNKNOWN";
        const platformLabel =
          thread.externalChannelLabel ??
          PLATFORM_LABELS[platformCode as SocialPlatformCode] ??
          labelSocialPlatform(platformCode);
        return {
          threadId: thread.threadId,
          platformCode,
          platformLabel,
          displayLabel:
            displayByThreadId.get(thread.threadId) ??
            thread.counterpartyLegalName ??
            thread.title ??
            platformLabel,
          lastMessagePreview: thread.lastMessagePreview,
          lastMessageAt: thread.lastMessageAt,
          unreadCount: thread.unreadCount,
          isOpen: openByThreadId.get(thread.threadId) ?? true,
          messagingDeepLink: buildSocialInboxThreadDeepLink(thread.threadId),
        };
      },
    );
    return { threads };
  }

  public async ingestWebhookInbound(params: {
    companyId: string;
    platformCode: SocialPlatformCode | string;
    externalThreadId: string;
    displayLabel: string;
    bodyText: string;
    externalMessageId: string | null;
  }): Promise<{ ingested: boolean; threadId?: string }> {
    const link = await this.ensureExternalThread({
      companyId: params.companyId,
      platformCode: params.platformCode,
      externalThreadId: params.externalThreadId,
      displayLabel: params.displayLabel,
    });
    const dedupKey = resolveInboundDedupKey(params);
    if (dedupKey && link.lastExternalMessageId === dedupKey) {
      if (params.externalMessageId?.trim()) {
        return { ingested: false, threadId: link.messageThreadId };
      }
      const dedupSeconds = webhookInboundDedupSeconds();
      if (
        dedupSeconds > 0 &&
        link.lastInboundAt &&
        Date.now() - link.lastInboundAt.getTime() < dedupSeconds * 1000
      ) {
        return { ingested: false, threadId: link.messageThreadId };
      }
    }
    await this.ingestInboundMessage(
      params.companyId,
      link.id,
      params.bodyText,
    );
    if (dedupKey) {
      link.lastExternalMessageId = dedupKey;
      await this.linkRepository.save(link);
    }
    return { ingested: true, threadId: link.messageThreadId };
  }
}

function webhookInboundDedupSeconds(): number {
  const raw = process.env.SOCIAL_HUB_WEBHOOK_INBOUND_DEDUP_SECONDS?.trim();
  if (!raw) {
    return 0;
  }
  const parsed = Number.parseInt(raw, 10);
  return parsed > 0 ? parsed : 0;
}

function resolveInboundDedupKey(params: {
  externalThreadId: string;
  bodyText: string;
  externalMessageId: string | null;
}): string | null {
  if (params.externalMessageId?.trim()) {
    return params.externalMessageId.trim();
  }
  const window = webhookInboundDedupSeconds();
  if (window <= 0) {
    return null;
  }
  const hash = createHash("sha256")
    .update(`${params.externalThreadId}\n${params.bodyText.trim()}`)
    .digest("hex")
    .slice(0, 40);
  return `body:${hash}`;
}
