import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Repository } from "typeorm";
import {
  AuthenticatedUserContext,
  AuthorizationException,
  MessagingThreadMessageView,
  MessagingThreadNotFoundException,
  MessagingThreadReference,
  MessagingThreadSummary,
  CompanyRoleCode,
  SubscriptionModuleCode,
  ValidationException,
} from "@nakliyeborsasi/core";
import { MessageThreadEntity } from "../../infrastructure/database/entities/MessageThreadEntity";
import {
  MessageEntity,
  type MessageAttachmentMeta,
} from "../../infrastructure/database/entities/MessageEntity";
import { MessagingAttachmentStorageService } from "./MessagingAttachmentStorageService";
import type { MessagingAttachmentInput } from "./MessagingAttachmentStorageService";
import { MessagingWebPushService } from "./MessagingWebPushService";
import { MessageThreadReadStateEntity } from "../../infrastructure/database/entities/MessageThreadReadStateEntity";
import { OpenMessagingThreadRequestDto } from "./OpenMessagingThreadRequestDto";
import { ModularSubscriptionEntitlementService } from "../subscription/ModularSubscriptionEntitlementService";
import { OperationalNotificationService } from "../notification/OperationalNotificationService";
import { CompanyEntity } from "../../infrastructure/database/entities/CompanyEntity";
import { FreightListingEntity } from "../../infrastructure/database/entities/FreightListingEntity";
import { buildStructuredThreadSummary } from "./MessagingThreadSummaryBuilder";
import { MessagingRealtimeHubService } from "./MessagingRealtimeHubService";
import { MessagingOrgChannelService } from "./MessagingOrgChannelService";

@Injectable()
export class MessagingThreadApplicationService {
  public constructor(
    @InjectRepository(MessageThreadEntity)
    private readonly messageThreadRepository: Repository<MessageThreadEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @InjectRepository(MessageThreadReadStateEntity)
    private readonly readStateRepository: Repository<MessageThreadReadStateEntity>,
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,
    @InjectRepository(FreightListingEntity)
    private readonly freightListingRepository: Repository<FreightListingEntity>,
    private readonly modularSubscriptionEntitlementService: ModularSubscriptionEntitlementService,
    private readonly operationalNotificationService: OperationalNotificationService,
    private readonly messagingAttachmentStorageService: MessagingAttachmentStorageService,
    private readonly messagingWebPushService: MessagingWebPushService,
    private readonly messagingRealtimeHubService: MessagingRealtimeHubService,
    private readonly messagingOrgChannelService: MessagingOrgChannelService,
  ) {}

  public async assertMessagingModule(
    authenticatedUser: AuthenticatedUserContext,
    locale: string,
  ): Promise<void> {
    await this.modularSubscriptionEntitlementService.assertModuleAccess(
      authenticatedUser.companyId,
      SubscriptionModuleCode.Messaging,
      locale,
    );
  }

  public async openThread(
    authenticatedUser: AuthenticatedUserContext,
    payload: OpenMessagingThreadRequestDto,
    locale: string,
  ): Promise<MessageThreadEntity> {
    await this.modularSubscriptionEntitlementService.assertModuleAccess(
      authenticatedUser.companyId,
      SubscriptionModuleCode.Messaging,
      locale,
    );
    if (payload.counterpartyCompanyId === authenticatedUser.companyId) {
      throw new ValidationException("Cannot open thread with own company");
    }
    const pair = this.normalizeCompanyPair(
      authenticatedUser.companyId,
      payload.counterpartyCompanyId,
    );
    const listingFilter = payload.freightListingId ?? null;
    const existing = await this.messageThreadRepository.findOne({
      where: {
        companyAId: pair.companyAId,
        companyBId: pair.companyBId,
        freightListingId: listingFilter ? listingFilter : IsNull(),
      },
    });
    if (existing) {
      return existing;
    }
    return this.messageThreadRepository.save(
      this.messageThreadRepository.create({
        companyAId: pair.companyAId,
        companyBId: pair.companyBId,
        freightListingId: payload.freightListingId ?? null,
      }),
    );
  }

  public async listThreads(
    authenticatedUser: AuthenticatedUserContext,
    locale: string,
  ): Promise<MessagingThreadReference[]> {
    await this.modularSubscriptionEntitlementService.assertModuleAccess(
      authenticatedUser.companyId,
      SubscriptionModuleCode.Messaging,
      locale,
    );
    await this.messagingOrgChannelService.ensureDefaultChannels(
      authenticatedUser.companyId,
    );
    const threads = await this.messageThreadRepository
      .createQueryBuilder("thread")
      .where("thread.companyAId = :companyId OR thread.companyBId = :companyId", {
        companyId: authenticatedUser.companyId,
      })
      .orderBy("thread.createdAt", "DESC")
      .getMany();
    const counterpartyIds = threads.map((thread) =>
      thread.companyAId === authenticatedUser.companyId
        ? thread.companyBId
        : thread.companyAId,
    );
    const companies =
      counterpartyIds.length > 0
        ? await this.companyRepository.find({
            where: { id: In(counterpartyIds) },
          })
        : [];
    const companyNameById = new Map(
      companies.map((row) => [row.id, row.legalName]),
    );
    const threadIds = threads.map((thread) => thread.id);
    const readStates =
      threadIds.length > 0
        ? await this.readStateRepository.find({
            where: {
              threadId: In(threadIds),
              companyId: authenticatedUser.companyId,
            },
          })
        : [];
    const lastReadAtByThreadId = new Map(
      readStates.map((row) => [row.threadId, row.lastReadAt]),
    );
    const enriched: MessagingThreadReference[] = [];
    for (const thread of threads) {
      const isOrgChannel = this.messagingOrgChannelService.isOrgChannel(thread);
      const counterpartyCompanyId =
        thread.companyAId === authenticatedUser.companyId
          ? thread.companyBId
          : thread.companyAId;
      const lastMessage = await this.messageRepository.findOne({
        where: { threadId: thread.id },
        order: { createdAt: "DESC" },
      });
      const lastReadAt = lastReadAtByThreadId.get(thread.id) ?? null;
      const unreadCount = await this.countUnreadMessages({
        threadId: thread.id,
        viewerCompanyId: authenticatedUser.companyId,
        viewerUserId: authenticatedUser.userId,
        isOrgChannel,
        lastReadAt,
      });
      const channelTitle =
        thread.channelName?.trim() ||
        (thread.channelSlug ? `#${thread.channelSlug}` : null);
      enriched.push(
        new MessagingThreadReference({
          threadId: thread.id,
          counterpartyCompanyId,
          counterpartyLegalName: isOrgChannel
            ? channelTitle
            : (companyNameById.get(counterpartyCompanyId) ?? null),
          lastMessagePreview: lastMessage?.bodyText?.slice(0, 120) ?? null,
          lastMessageAt: lastMessage?.createdAt?.toISOString() ?? null,
          freightListingId: thread.freightListingId,
          unreadCount,
          threadKind: thread.threadKind ?? "b2b",
          channelSlug: thread.channelSlug,
          channelName: thread.channelName,
        }),
      );
    }
    enriched.sort((a, b) => {
      const left = a.lastMessageAt ?? "";
      const right = b.lastMessageAt ?? "";
      return right.localeCompare(left);
    });
    return enriched;
  }

  public async listMessages(
    authenticatedUser: AuthenticatedUserContext,
    threadId: string,
    locale: string,
  ): Promise<MessagingThreadMessageView[]> {
    const thread = await this.requireParticipantThread(
      authenticatedUser,
      threadId,
      locale,
    );
    const messages = await this.messageRepository.find({
      where: { threadId: thread.id },
      order: { createdAt: "ASC" },
    });
    const isOrgChannel = this.messagingOrgChannelService.isOrgChannel(thread);
    const counterpartyCompanyId =
      thread.companyAId === authenticatedUser.companyId
        ? thread.companyBId
        : thread.companyAId;
    const counterpartyRead = isOrgChannel
      ? null
      : await this.readStateRepository.findOne({
          where: { threadId: thread.id, companyId: counterpartyCompanyId },
        });
    const counterpartyLastReadAt = counterpartyRead?.lastReadAt ?? null;
    const views = messages.map((message) => {
      const isMine =
        message.senderUserId === authenticatedUser.userId &&
        message.senderKind !== "bot";
      const readByRecipient =
        !isOrgChannel &&
        isMine &&
        counterpartyLastReadAt !== null &&
        message.createdAt.getTime() <= counterpartyLastReadAt.getTime();
      return new MessagingThreadMessageView({
        id: message.id,
        senderCompanyId: message.senderCompanyId,
        bodyText: message.bodyText,
        createdAt: message.createdAt.toISOString(),
        readByRecipient,
        attachments: this.publicAttachments(message.attachments),
        senderKind: message.senderKind ?? "user",
        senderLabel: message.senderLabel,
      });
    });
    const latest = messages.at(-1);
    if (latest) {
      await this.upsertReadState(
        thread.id,
        authenticatedUser.companyId,
        latest.createdAt,
      );
    }
    return views;
  }

  public async sendMessage(
    authenticatedUser: AuthenticatedUserContext,
    threadId: string,
    bodyText: string,
    locale: string,
    attachmentsInput?: MessagingAttachmentInput[],
  ): Promise<MessageEntity> {
    const thread = await this.requireParticipantThread(
      authenticatedUser,
      threadId,
      locale,
    );
    const trimmed = bodyText.trim();
    if (!trimmed && (!attachmentsInput || attachmentsInput.length === 0)) {
      throw new ValidationException("Mesaj metni veya ek gerekli");
    }
    const draft = this.messageRepository.create({
      threadId: thread.id,
      senderCompanyId: authenticatedUser.companyId,
      senderUserId: authenticatedUser.userId,
      bodyText: trimmed || "📎 Ek dosya",
      senderKind: "user",
      senderLabel: null,
      attachments: null,
    });
    const saved = await this.messageRepository.save(draft);
    const stored = await this.messagingAttachmentStorageService.persistForMessage(
      thread.id,
      saved.id,
      attachmentsInput,
    );
    if (stored) {
      saved.attachments = stored;
      await this.messageRepository.save(saved);
    }
    const isOrgChannel = this.messagingOrgChannelService.isOrgChannel(thread);
    const counterpartyCompanyId =
      thread.companyAId === authenticatedUser.companyId
        ? thread.companyBId
        : thread.companyAId;
    const senderCompany = await this.companyRepository.findOne({
      where: { id: authenticatedUser.companyId },
    });
    const preview =
      trimmed.length > 0
        ? trimmed.slice(0, 280)
        : stored?.map((item) => item.filename).join(", ").slice(0, 280) ??
          "Ek dosya";
    const senderLabel =
      senderCompany?.legalName?.trim() || authenticatedUser.companyId;
    if (!isOrgChannel) {
      void this.operationalNotificationService.afterMessagingMessageSent({
        threadId: thread.id,
        counterpartyCompanyId,
        senderCompanyId: authenticatedUser.companyId,
        senderCompanyName: senderLabel,
        messageId: saved.id,
        bodyPreview: preview,
        freightListingId: thread.freightListingId,
      });
      void this.messagingWebPushService.notifyNewChatMessage({
        companyId: counterpartyCompanyId,
        threadId: thread.id,
        senderCompanyName: senderLabel,
        bodyPreview: preview,
        freightListingId: thread.freightListingId,
      });
    } else {
      void this.messagingWebPushService.notifyNewChatMessage({
        companyId: authenticatedUser.companyId,
        threadId: thread.id,
        senderCompanyName: thread.channelName ?? "Kanal",
        bodyPreview: preview,
        freightListingId: null,
      });
    }
    const event = { type: "message", threadId: thread.id };
    this.messagingRealtimeHubService.publish(thread.companyAId, event);
    if (!isOrgChannel) {
      this.messagingRealtimeHubService.publish(thread.companyBId, event);
    }
    return saved;
  }

  public async getMessageAttachment(
    authenticatedUser: AuthenticatedUserContext,
    threadId: string,
    messageId: string,
    attachmentIndex: number,
    locale: string,
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    await this.requireParticipantThread(authenticatedUser, threadId, locale);
    const message = await this.messageRepository.findOne({
      where: { id: messageId, threadId },
    });
    if (!message?.attachments?.length) {
      throw new MessagingThreadNotFoundException(messageId);
    }
    const meta = message.attachments.find((row) => row.index === attachmentIndex);
    if (!meta) {
      throw new MessagingThreadNotFoundException(messageId);
    }
    return this.messagingAttachmentStorageService.readAttachment(
      threadId,
      messageId,
      meta,
    );
  }

  private publicAttachments(
    attachments: MessageAttachmentMeta[] | null,
  ): { index: number; filename: string; contentType: string; sizeBytes: number }[] {
    if (!attachments?.length) {
      return [];
    }
    return attachments.map((row) => ({
      index: row.index,
      filename: row.filename,
      contentType: row.contentType,
      sizeBytes: row.sizeBytes,
    }));
  }

  public async getThreadSummary(
    authenticatedUser: AuthenticatedUserContext,
    threadId: string,
    locale: string,
  ): Promise<MessagingThreadSummary> {
    const thread = await this.requireParticipantThread(
      authenticatedUser,
      threadId,
      locale,
    );
    const messages = await this.messageRepository.find({
      where: { threadId: thread.id },
      order: { createdAt: "ASC" },
    });
    const counterpartyCompanyId =
      thread.companyAId === authenticatedUser.companyId
        ? thread.companyBId
        : thread.companyAId;
    const counterparty = await this.companyRepository.findOne({
      where: { id: counterpartyCompanyId },
    });
    const listing =
      thread.freightListingId
        ? await this.freightListingRepository.findOne({
            where: { id: thread.freightListingId },
          })
        : null;
    return buildStructuredThreadSummary({
      messages,
      listing,
      counterpartyLegalName: counterparty?.legalName ?? null,
    });
  }

  public async exportCompanyArchive(
    authenticatedUser: AuthenticatedUserContext,
    locale: string,
  ): Promise<{
    exportedAt: string;
    companyId: string;
    threads: {
      threadId: string;
      counterpartyCompanyId: string;
      freightListingId: string | null;
      createdAt: string;
      messages: {
        id: string;
        senderCompanyId: string;
        senderUserId: string;
        bodyText: string;
        createdAt: string;
      }[];
    }[];
  }> {
    if (!authenticatedUser.roleCodes.includes(CompanyRoleCode.CompanyOwner)) {
      throw new AuthorizationException(
        "Messaging export requires company owner role",
      );
    }
    await this.modularSubscriptionEntitlementService.assertModuleAccess(
      authenticatedUser.companyId,
      SubscriptionModuleCode.Messaging,
      locale,
    );
    const threads = await this.messageThreadRepository
      .createQueryBuilder("thread")
      .where("thread.companyAId = :companyId OR thread.companyBId = :companyId", {
        companyId: authenticatedUser.companyId,
      })
      .orderBy("thread.createdAt", "ASC")
      .getMany();
    const payloadThreads = [];
    for (const thread of threads) {
      const messages = await this.messageRepository.find({
        where: { threadId: thread.id },
        order: { createdAt: "ASC" },
      });
      const counterpartyCompanyId =
        thread.companyAId === authenticatedUser.companyId
          ? thread.companyBId
          : thread.companyAId;
      payloadThreads.push({
        threadId: thread.id,
        counterpartyCompanyId,
        freightListingId: thread.freightListingId,
        createdAt: thread.createdAt.toISOString(),
        messages: messages.map((message) => ({
          id: message.id,
          senderCompanyId: message.senderCompanyId,
          senderUserId: message.senderUserId,
          bodyText: message.bodyText,
          createdAt: message.createdAt.toISOString(),
          attachments: this.publicAttachments(message.attachments),
        })),
      });
    }
    return {
      exportedAt: new Date().toISOString(),
      companyId: authenticatedUser.companyId,
      threads: payloadThreads,
    };
  }

  private async requireParticipantThread(
    authenticatedUser: AuthenticatedUserContext,
    threadId: string,
    locale: string,
  ): Promise<MessageThreadEntity> {
    await this.modularSubscriptionEntitlementService.assertModuleAccess(
      authenticatedUser.companyId,
      SubscriptionModuleCode.Messaging,
      locale,
    );
    const thread = await this.messageThreadRepository.findOne({
      where: { id: threadId },
    });
    if (!thread) {
      throw new MessagingThreadNotFoundException(threadId);
    }
    if (thread.threadKind === "org_channel") {
      if (thread.companyAId !== authenticatedUser.companyId) {
        throw new AuthorizationException("Thread access denied");
      }
      return thread;
    }
    const isParticipant =
      thread.companyAId === authenticatedUser.companyId ||
      thread.companyBId === authenticatedUser.companyId;
    if (!isParticipant) {
      throw new AuthorizationException("Thread access denied");
    }
    return thread;
  }

  private async countUnreadMessages(params: {
    threadId: string;
    viewerCompanyId: string;
    viewerUserId: string;
    isOrgChannel: boolean;
    lastReadAt: Date | null | undefined;
  }): Promise<number> {
    const qb = this.messageRepository
      .createQueryBuilder("message")
      .where("message.threadId = :threadId", { threadId: params.threadId });
    if (params.isOrgChannel) {
      qb.andWhere("message.senderUserId != :viewerUserId", {
        viewerUserId: params.viewerUserId,
      });
    } else {
      qb.andWhere("message.senderCompanyId != :viewerCompanyId", {
        viewerCompanyId: params.viewerCompanyId,
      });
    }
    if (params.lastReadAt) {
      qb.andWhere("message.createdAt > :lastReadAt", {
        lastReadAt: params.lastReadAt,
      });
    }
    return qb.getCount();
  }

  private async upsertReadState(
    threadId: string,
    companyId: string,
    lastReadAt: Date,
  ): Promise<void> {
    const existing = await this.readStateRepository.findOne({
      where: { threadId, companyId },
    });
    if (existing) {
      if (
        !existing.lastReadAt ||
        existing.lastReadAt.getTime() < lastReadAt.getTime()
      ) {
        existing.lastReadAt = lastReadAt;
        await this.readStateRepository.save(existing);
      }
      return;
    }
    await this.readStateRepository.save(
      this.readStateRepository.create({
        threadId,
        companyId,
        lastReadAt,
      }),
    );
  }

  private normalizeCompanyPair(
    companyIdA: string,
    companyIdB: string,
  ): { companyAId: string; companyBId: string } {
    if (companyIdA.localeCompare(companyIdB) <= 0) {
      return { companyAId: companyIdA, companyBId: companyIdB };
    }
    return { companyAId: companyIdB, companyBId: companyIdA };
  }
}
