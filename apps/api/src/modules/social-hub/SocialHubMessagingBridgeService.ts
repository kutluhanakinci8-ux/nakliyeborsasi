import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "node:crypto";
import { Repository } from "typeorm";
import { SocialPlatformCode, ValidationException } from "@nakliyeborsasi/core";
import { CompanySocialThreadLinkEntity } from "../../infrastructure/database/entities/CompanySocialThreadLinkEntity";
import { MessageThreadEntity } from "../../infrastructure/database/entities/MessageThreadEntity";
import { MessagingThreadApplicationService } from "../messaging/MessagingThreadApplicationService";

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
    platformCode: SocialPlatformCode;
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
    const platformLabel = PLATFORM_LABELS[params.platformCode] ?? params.platformCode;
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
}
