import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, In, IsNull, Repository } from "typeorm";
import {
  AuthenticatedUserContext,
  AuthorizationException,
  MessagingThreadMessageView,
  MessagingThreadNotFoundException,
  MessagingThreadReference,
  MessagingThreadSummary,
  CompanyRoleCode,
  SocialPlatformCode,
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
import { MessageThreadUserReadStateEntity } from "../../infrastructure/database/entities/MessageThreadUserReadStateEntity";
import { UserAccountEntity } from "../../infrastructure/database/entities/UserAccountEntity";
import { CompanyMembershipEntity } from "../../infrastructure/database/entities/CompanyMembershipEntity";
import { parseMessagingMentionUserIds } from "./MessagingMentionParser";
import { OpenMessagingThreadRequestDto } from "./OpenMessagingThreadRequestDto";
import { ModularSubscriptionEntitlementService } from "../subscription/ModularSubscriptionEntitlementService";
import { OperationalNotificationService } from "../notification/OperationalNotificationService";
import { CompanyEntity } from "../../infrastructure/database/entities/CompanyEntity";
import { FreightListingEntity } from "../../infrastructure/database/entities/FreightListingEntity";
import { buildStructuredThreadSummary } from "./MessagingThreadSummaryBuilder";
import { MessagingRealtimeHubService } from "./MessagingRealtimeHubService";
import { listMessagingQuickReplies } from "./MessagingQuickReplyCatalog";
import { buildOfferTimeline } from "./MessagingOfferTimelineBuilder";
import { buildMessagingListingCard } from "./MessagingListingCardBuilder";
import { MailAiComposeService } from "../notification/MailAiComposeService";
import {
  MessagingAuditActionCode,
  MessagingAuditService,
} from "./MessagingAuditService";
import { MessagingCompanyMessageRateLimitService } from "./MessagingCompanyMessageRateLimitService";
import type { MessagingClientRequestContext } from "./MessagingClientRequestContext";
import { MessagingWebhookDispatcherService } from "./MessagingWebhookDispatcherService";
import { MessagingSlackBridgeService } from "./MessagingSlackBridgeService";
import { MessagingWhatsappBridgeService } from "./MessagingWhatsappBridgeService";
import { MessagingThreadParticipantService } from "./MessagingThreadParticipantService";
import { OpenMessagingGroupThreadRequestDto } from "./OpenMessagingGroupThreadRequestDto";
import { AuctionListingPriceActionService } from "../auction/AuctionListingPriceActionService";
import {
  CompanyMessagingSettingsEntity,
  type CompanyOrgQuickReplyTemplate,
} from "../../infrastructure/database/entities/CompanyMessagingSettingsEntity";
import {
  MessageOperationStampEntity,
  type MessagingOperationStampType,
} from "../../infrastructure/database/entities/MessageOperationStampEntity";
import type { MessagingGroupParticipantRole } from "../../infrastructure/database/entities/MessageThreadParticipantEntity";
import { TrustScoreApplicationService } from "../trust/TrustScoreApplicationService";
import { randomUUID } from "node:crypto";
import { CompanySocialReplyTemplateEntity } from "../../infrastructure/database/entities/CompanySocialReplyTemplateEntity";
import { CompanySocialThreadLinkEntity } from "../../infrastructure/database/entities/CompanySocialThreadLinkEntity";
const EXTERNAL_CHANNEL_LABELS: Record<string, string> = {
  [SocialPlatformCode.Instagram]: "Instagram",
  [SocialPlatformCode.FacebookMessenger]: "Facebook Messenger",
  [SocialPlatformCode.WhatsAppCloud]: "WhatsApp",
  [SocialPlatformCode.LinkedIn]: "LinkedIn",
};

const EXTERNAL_INBOUND_SENDER_USER_ID = "00000000-0000-0000-0000-000000000001";

const COMPANY_UUID_SEARCH_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function escapeIlikeFragment(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

@Injectable()
export class MessagingThreadApplicationService {
  public constructor(
    @InjectRepository(MessageThreadEntity)
    private readonly messageThreadRepository: Repository<MessageThreadEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @InjectRepository(MessageThreadReadStateEntity)
    private readonly readStateRepository: Repository<MessageThreadReadStateEntity>,
    @InjectRepository(MessageThreadUserReadStateEntity)
    private readonly userReadStateRepository: Repository<MessageThreadUserReadStateEntity>,
    @InjectRepository(UserAccountEntity)
    private readonly userAccountRepository: Repository<UserAccountEntity>,
    @InjectRepository(CompanyMembershipEntity)
    private readonly companyMembershipRepository: Repository<CompanyMembershipEntity>,
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,
    @InjectRepository(FreightListingEntity)
    private readonly freightListingRepository: Repository<FreightListingEntity>,
    @InjectRepository(CompanyMessagingSettingsEntity)
    private readonly companyMessagingSettingsRepository: Repository<CompanyMessagingSettingsEntity>,
    @InjectRepository(MessageOperationStampEntity)
    private readonly messageOperationStampRepository: Repository<MessageOperationStampEntity>,
    @InjectRepository(CompanySocialReplyTemplateEntity)
    private readonly socialReplyTemplateRepository: Repository<CompanySocialReplyTemplateEntity>,
    @InjectRepository(CompanySocialThreadLinkEntity)
    private readonly socialThreadLinkRepository: Repository<CompanySocialThreadLinkEntity>,
    private readonly trustScoreApplicationService: TrustScoreApplicationService,
    private readonly modularSubscriptionEntitlementService: ModularSubscriptionEntitlementService,
    private readonly operationalNotificationService: OperationalNotificationService,
    private readonly messagingAttachmentStorageService: MessagingAttachmentStorageService,
    private readonly messagingWebPushService: MessagingWebPushService,
    private readonly messagingRealtimeHubService: MessagingRealtimeHubService,
    private readonly mailAiComposeService: MailAiComposeService,
    private readonly messagingAuditService: MessagingAuditService,
    private readonly messagingCompanyMessageRateLimitService: MessagingCompanyMessageRateLimitService,
    private readonly messagingWebhookDispatcherService: MessagingWebhookDispatcherService,
    private readonly messagingSlackBridgeService: MessagingSlackBridgeService,
    private readonly messagingWhatsappBridgeService: MessagingWhatsappBridgeService,
    private readonly messagingThreadParticipantService: MessagingThreadParticipantService,
    @Inject(forwardRef(() => AuctionListingPriceActionService))
    private readonly auctionListingPriceActionService: AuctionListingPriceActionService,
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
    const created = await this.messageThreadRepository.save(
      this.messageThreadRepository.create({
        companyAId: pair.companyAId,
        companyBId: pair.companyBId,
        freightListingId: payload.freightListingId ?? null,
        threadKind: "pair",
        title: null,
      }),
    );
    await this.messagingThreadParticipantService.addParticipants(created.id, [
      created.companyAId,
      created.companyBId,
    ]);
    const openedPayload = {
      threadId: created.id,
      companyAId: created.companyAId,
      companyBId: created.companyBId,
      freightListingId: created.freightListingId,
      openedByCompanyId: authenticatedUser.companyId,
      openedByUserId: authenticatedUser.userId,
    };
    await this.fanOutWebhook(created, "thread.opened", openedPayload);
    return created;
  }

  public async openGroupThread(
    authenticatedUser: AuthenticatedUserContext,
    payload: OpenMessagingGroupThreadRequestDto,
    locale: string,
  ): Promise<MessageThreadEntity> {
    await this.modularSubscriptionEntitlementService.assertModuleAccess(
      authenticatedUser.companyId,
      SubscriptionModuleCode.Messaging,
      locale,
    );
    const participantIds = [
      ...new Set([
        authenticatedUser.companyId,
        ...payload.participantCompanyIds,
      ]),
    ];
    if (participantIds.length < 3) {
      throw new ValidationException(
        "Grup sohbet için en az 3 farklı firma gerekir.",
      );
    }
    const listingFilter = payload.freightListingId ?? null;
    const title = payload.title?.trim().slice(0, 120) ?? null;
    const existing =
      await this.messagingThreadParticipantService.findGroupThreadsForCompanies(
        participantIds,
        listingFilter,
        title,
      );
    if (existing) {
      return existing;
    }
    const sorted = [...participantIds].sort();
    const pair = this.normalizeCompanyPair(sorted[0], sorted[1]);
    const created = await this.messageThreadRepository.save(
      this.messageThreadRepository.create({
        companyAId: pair.companyAId,
        companyBId: pair.companyBId,
        freightListingId: listingFilter,
        threadKind: "group",
        title,
      }),
    );
    const roleMap: Record<string, MessagingGroupParticipantRole> = {
      [authenticatedUser.companyId]: "agent",
      ...(payload.participantRoles ?? {}),
    };
    await this.messagingThreadParticipantService.addParticipants(
      created.id,
      participantIds,
      roleMap,
    );
    const openedPayload = {
      threadId: created.id,
      threadKind: "group",
      title,
      participantCompanyIds: participantIds,
      freightListingId: created.freightListingId,
      openedByCompanyId: authenticatedUser.companyId,
      openedByUserId: authenticatedUser.userId,
    };
    await this.fanOutWebhook(created, "thread.opened", openedPayload);
    return created;
  }

  public async acceptFixedPriceFromThread(
    authenticatedUser: AuthenticatedUserContext,
    threadId: string,
    locale: string,
  ): Promise<{ sessionId: string; bidId: string; systemMessageId: string }> {
    const thread = await this.requireParticipantThread(
      authenticatedUser,
      threadId,
      locale,
    );
    if (!thread.freightListingId) {
      throw new ValidationException("Bu sohbet bir yük ilanına bağlı değil.");
    }
    const result =
      await this.auctionListingPriceActionService.acceptListingFixedPrice(
        authenticatedUser,
        thread.freightListingId,
        locale,
      );
    const systemMessage = await this.sendMessage(
      authenticatedUser,
      thread.id,
      "✅ **Sabit fiyat teklifi kabul edildi** — ihale kaydı güncellendi.",
      locale,
      undefined,
      "public",
    );
    return {
      sessionId: result.sessionId,
      bidId: result.bidId,
      systemMessageId: systemMessage.id,
    };
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
    const pairThreads = await this.messageThreadRepository
      .createQueryBuilder("thread")
      .where("thread.companyAId = :companyId OR thread.companyBId = :companyId", {
        companyId: authenticatedUser.companyId,
      })
      .andWhere("(thread.threadKind = 'pair' OR thread.threadKind IS NULL)")
      .orderBy("thread.createdAt", "DESC")
      .getMany();
    const groupIds =
      await this.messagingThreadParticipantService.listGroupThreadIdsForCompany(
        authenticatedUser.companyId,
      );
    const groupThreads =
      groupIds.length > 0
        ? await this.messageThreadRepository.find({
            where: { id: In(groupIds), threadKind: "group" },
          })
        : [];
    const seen = new Set(pairThreads.map((thread) => thread.id));
    const externalThreads = await this.messageThreadRepository.find({
      where: {
        companyAId: authenticatedUser.companyId,
        threadKind: "external_social",
      },
      order: { createdAt: "DESC" },
    });
    const threads = [
      ...pairThreads,
      ...groupThreads.filter((thread) => !seen.has(thread.id)),
      ...externalThreads.filter((thread) => !seen.has(thread.id)),
    ];
    const socialLinks =
      externalThreads.length > 0
        ? await this.socialThreadLinkRepository.find({
            where: {
              companyId: authenticatedUser.companyId,
              messageThreadId: In(externalThreads.map((thread) => thread.id)),
            },
          })
        : [];
    const socialLinkByThreadId = new Map(
      socialLinks.map((link) => [link.messageThreadId, link]),
    );
    const counterpartyIds = threads
      .filter((thread) => thread.threadKind !== "external_social")
      .map((thread) =>
        this.resolveCounterpartyCompanyId(thread, authenticatedUser.companyId),
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
      const counterpartyCompanyId = this.resolveCounterpartyCompanyId(
        thread,
        authenticatedUser.companyId,
      );
      const participantCompanyIds =
        thread.threadKind === "group"
          ? await this.messagingThreadParticipantService.listParticipants(
              thread.id,
            )
          : null;
      const socialLink = socialLinkByThreadId.get(thread.id);
      const lastMessage = await this.messageRepository.findOne({
        where: { threadId: thread.id },
        order: { createdAt: "DESC" },
      });
      const lastReadAt = lastReadAtByThreadId.get(thread.id) ?? null;
      const unreadCount = await this.countUnreadMessages(
        thread.id,
        authenticatedUser.companyId,
        lastReadAt,
      );
      const externalChannelCode = socialLink?.platformCode ?? null;
      enriched.push(
        new MessagingThreadReference({
          threadId: thread.id,
          counterpartyCompanyId:
            thread.threadKind === "external_social"
              ? thread.companyBId
              : counterpartyCompanyId,
          counterpartyLegalName:
            thread.threadKind === "external_social"
              ? socialLink?.displayLabel ?? thread.title
              : thread.threadKind === "group"
                ? thread.title ??
                  `Grup sohbet (${participantCompanyIds?.length ?? 0} firma)`
                : companyNameById.get(counterpartyCompanyId) ?? null,
          lastMessagePreview: lastMessage?.bodyText?.slice(0, 120) ?? null,
          lastMessageAt: lastMessage?.createdAt?.toISOString() ?? null,
          freightListingId: thread.freightListingId,
          unreadCount,
          threadKind: thread.threadKind ?? "pair",
          title: thread.title,
          participantCompanyIds,
          externalChannelCode,
          externalChannelLabel:
            externalChannelCode
              ? EXTERNAL_CHANNEL_LABELS[externalChannelCode] ??
                externalChannelCode
              : null,
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
    const visible = messages.filter(
      (message) =>
        message.kind !== "internal" ||
        message.senderCompanyId === authenticatedUser.companyId,
    );
    const counterpartyCompanyId =
      thread.companyAId === authenticatedUser.companyId
        ? thread.companyBId
        : thread.companyAId;
    const counterpartyRead = await this.readStateRepository.findOne({
      where: { threadId: thread.id, companyId: counterpartyCompanyId },
    });
    const counterpartyLastReadAt = counterpartyRead?.lastReadAt ?? null;
    const counterpartyUserReads = await this.userReadStateRepository.find({
      where: { threadId: thread.id, companyId: counterpartyCompanyId },
    });
    const counterpartyUserIds = [
      ...new Set(counterpartyUserReads.map((row) => row.userId)),
    ];
    const counterpartyUsers =
      counterpartyUserIds.length > 0
        ? await this.userAccountRepository.find({
            where: { id: In(counterpartyUserIds) },
          })
        : [];
    const counterpartyUserNameById = new Map(
      counterpartyUsers.map((row) => [
        row.id,
        row.displayName?.trim() ||
          row.emailAddress?.trim() ||
          row.id.slice(0, 8),
      ]),
    );
    const messageCreatedMs = (value: Date | string): number =>
      value instanceof Date ? value.getTime() : new Date(value).getTime();

    const visibleIds = visible.map((row) => row.id);
    const stampRows =
      visibleIds.length > 0
        ? await this.messageOperationStampRepository.find({
            where: { messageId: In(visibleIds) },
            order: { createdAt: "ASC" },
          })
        : [];
    const stampUserIds = [
      ...new Set(stampRows.map((row) => row.stampedByUserId)),
    ];
    const stampUsers =
      stampUserIds.length > 0
        ? await this.userAccountRepository.find({
            where: { id: In(stampUserIds) },
          })
        : [];
    const stampUserNameById = new Map(
      stampUsers.map((row) => [
        row.id,
        row.displayName?.trim() ||
          row.emailAddress?.trim() ||
          row.id.slice(0, 8),
      ]),
    );
    const stampsByMessageId = new Map<string, MessageOperationStampEntity[]>();
    for (const stamp of stampRows) {
      const bucket = stampsByMessageId.get(stamp.messageId) ?? [];
      bucket.push(stamp);
      stampsByMessageId.set(stamp.messageId, bucket);
    }

    const views = visible.map((message) => {
      const isMine = message.senderCompanyId === authenticatedUser.companyId;
      const createdMs = messageCreatedMs(message.createdAt);
      const readByCounterpartyUserIds = isMine
        ? counterpartyUserReads
            .filter(
              (row) =>
                row.lastReadAt &&
                createdMs <= messageCreatedMs(row.lastReadAt),
            )
            .map((row) => row.userId)
        : [];
      const readByCounterpartyReaders = readByCounterpartyUserIds.map(
        (userId) => ({
          userId,
          displayName:
            counterpartyUserNameById.get(userId) ?? userId.slice(0, 8),
        }),
      );
      const readByRecipient =
        isMine &&
        (readByCounterpartyUserIds.length > 0 ||
          (counterpartyLastReadAt !== null &&
            createdMs <= messageCreatedMs(counterpartyLastReadAt)));
      const deleted = Boolean(message.deletedAt);
      const operationStamps = (stampsByMessageId.get(message.id) ?? []).map(
        (stamp) => ({
          stampType: stamp.stampType,
          stampedByCompanyId: stamp.stampedByCompanyId,
          stampedByUserId: stamp.stampedByUserId,
          stampedByDisplayName:
            stampUserNameById.get(stamp.stampedByUserId) ??
            stamp.stampedByUserId.slice(0, 8),
          createdAt: stamp.createdAt.toISOString(),
        }),
      );
      return new MessagingThreadMessageView({
        id: message.id,
        senderCompanyId: message.senderCompanyId,
        bodyText: deleted ? "[Mesaj silindi]" : message.bodyText,
        createdAt: message.createdAt.toISOString(),
        readByRecipient,
        readByCounterpartyUserIds,
        readByCounterpartyReaders,
        messageKind: message.kind ?? "public",
        editedAt: message.editedAt?.toISOString() ?? null,
        deleted,
        mentionUserIds: message.mentionUserIds ?? [],
        attachments: deleted ? [] : this.publicAttachments(message.attachments),
        operationStamps,
      });
    });
    const latest = visible.at(-1);
    if (latest) {
      const latestMs = messageCreatedMs(latest.createdAt);
      const markReadAt = new Date(Math.max(latestMs, Date.now()));
      await this.upsertReadState(
        thread.id,
        authenticatedUser.companyId,
        markReadAt,
      );
      await this.upsertUserReadState(
        thread.id,
        authenticatedUser.userId,
        authenticatedUser.companyId,
        markReadAt,
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
    messageKind: "public" | "internal" = "public",
    clientContext?: MessagingClientRequestContext,
    auditPath?: string,
  ): Promise<MessageEntity> {
    const thread = await this.requireParticipantThread(
      authenticatedUser,
      threadId,
      locale,
    );
    await this.messagingCompanyMessageRateLimitService.assertWithinLimit(
      authenticatedUser.companyId,
    );
    const trimmed = bodyText.trim();
    if (!trimmed && (!attachmentsInput || attachmentsInput.length === 0)) {
      throw new ValidationException("Mesaj metni veya ek gerekli");
    }
    const mentionUserIds = parseMessagingMentionUserIds(trimmed);
    const draft = this.messageRepository.create({
      threadId: thread.id,
      senderCompanyId: authenticatedUser.companyId,
      senderUserId: authenticatedUser.userId,
      bodyText: trimmed || "📎 Ek dosya",
      kind: messageKind === "internal" ? "internal" : "public",
      mentionUserIds: mentionUserIds.length > 0 ? mentionUserIds : null,
      deletedAt: null,
      editedAt: null,
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
    if (messageKind !== "internal") {
      void this.operationalNotificationService.afterMessagingMessageSent({
        threadId: thread.id,
        counterpartyCompanyId,
        senderCompanyId: authenticatedUser.companyId,
        senderCompanyName:
          senderCompany?.legalName?.trim() || authenticatedUser.companyId,
        messageId: saved.id,
        bodyPreview: preview,
        freightListingId: thread.freightListingId,
      });
      void this.messagingWebPushService.notifyNewChatMessage({
        companyId: counterpartyCompanyId,
        threadId: thread.id,
        senderCompanyName:
          senderCompany?.legalName?.trim() || authenticatedUser.companyId,
        bodyPreview: preview,
        freightListingId: thread.freightListingId,
      });
    }
    if (mentionUserIds.length > 0) {
      void this.operationalNotificationService.afterMessagingUserMention({
        companyId: authenticatedUser.companyId,
        mentionedUserIds: mentionUserIds,
        threadId: thread.id,
        senderCompanyName:
          senderCompany?.legalName?.trim() || authenticatedUser.companyId,
        messageId: saved.id,
        bodyPreview: preview,
        freightListingId: thread.freightListingId,
      });
    }
    const event = { type: "message", threadId: thread.id };
    await this.fanOutRealtime(thread, event);
    const createdPayload = {
      threadId: thread.id,
      messageId: saved.id,
      senderCompanyId: saved.senderCompanyId,
      senderUserId: saved.senderUserId,
      messageKind: saved.kind ?? "public",
      freightListingId: thread.freightListingId,
      bodyPreview: preview,
    };
    await this.fanOutWebhook(thread, "message.created", createdPayload);
    if (messageKind !== "internal") {
      await this.fanOutNotifyBridges(thread, {
        threadId: thread.id,
        messageId: saved.id,
        bodyPreview: preview,
        senderCompanyId: saved.senderCompanyId,
        freightListingId: thread.freightListingId,
      });
    }
    if (clientContext) {
      void this.messagingAuditService.recordMessageMutation(
        MessagingAuditActionCode.MessageCreate,
        authenticatedUser,
        clientContext,
        {
          threadId: thread.id,
          messageId: saved.id,
          httpMethod: "POST",
          requestPath:
            auditPath ?? `/messaging/threads/${threadId}/messages`,
          extra: { messageKind },
        },
      );
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
    options?: { includeLlm?: boolean },
  ): Promise<{
    summary: MessagingThreadSummary;
    listingCard: ReturnType<typeof buildMessagingListingCard>;
    offerTimeline: ReturnType<typeof buildOfferTimeline>;
    llmSummary: { text: string; provider: string } | null;
  }> {
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
    const summary = buildStructuredThreadSummary({
      messages,
      listing,
      counterpartyLegalName: counterparty?.legalName ?? null,
    });
    const listingCard = buildMessagingListingCard(listing);
    const listingPrice =
      listing?.priceAmount && listing.priceCurrencyCode
        ? { amount: listing.priceAmount, currency: listing.priceCurrencyCode }
        : null;
    const offerTimeline = buildOfferTimeline(messages, listingPrice);

    let llmSummary: { text: string; provider: string } | null = null;
    if (options?.includeLlm) {
      const transcript = messages
        .map(
          (row) =>
            `[${row.createdAt.toISOString()}] ${row.senderCompanyId}: ${row.bodyText}`,
        )
        .join("\n");
      const llm = await this.mailAiComposeService.summarizeMessagingThread({
        userId: authenticatedUser.userId,
        locale,
        transcript,
      });
      llmSummary = { text: llm.summary, provider: llm.provider };
    }

    return { summary, listingCard, offerTimeline, llmSummary };
  }

  public async listQuickReplies(
    authenticatedUser: AuthenticatedUserContext,
    locale: string,
  ): Promise<{ templates: ReturnType<typeof listMessagingQuickReplies> }> {
    await this.assertMessagingModule(authenticatedUser, locale);
    const orgExtras = await this.loadOrgQuickReplyTemplates(
      authenticatedUser.companyId,
    );
    const socialTemplates = await this.socialReplyTemplateRepository.find({
      where: { companyId: authenticatedUser.companyId },
      order: { sortOrder: "ASC", title: "ASC" },
      take: 30,
    });
    const socialExtras = socialTemplates.map((row) => ({
      id: `social-hub-${row.id}`,
      labelTr: row.title,
      bodyText: row.bodyText,
      scope: "organization" as const,
    }));
    return {
      templates: listMessagingQuickReplies([...orgExtras, ...socialExtras]),
    };
  }

  public async getOrgQuickReplies(
    authenticatedUser: AuthenticatedUserContext,
    locale: string,
  ): Promise<{ templates: CompanyOrgQuickReplyTemplate[] }> {
    if (!authenticatedUser.roleCodes.includes(CompanyRoleCode.CompanyOwner)) {
      throw new AuthorizationException(
        "Yalnızca şirket sahibi şablonları yönetebilir",
      );
    }
    await this.assertMessagingModule(authenticatedUser, locale);
    const templates = await this.loadOrgQuickReplyTemplates(
      authenticatedUser.companyId,
    );
    return { templates };
  }

  public async replaceOrgQuickReplies(
    authenticatedUser: AuthenticatedUserContext,
    locale: string,
    templatesInput: CompanyOrgQuickReplyTemplate[],
  ): Promise<{ templates: CompanyOrgQuickReplyTemplate[] }> {
    if (!authenticatedUser.roleCodes.includes(CompanyRoleCode.CompanyOwner)) {
      throw new AuthorizationException(
        "Yalnızca şirket sahibi şablonları yönetebilir",
      );
    }
    await this.assertMessagingModule(authenticatedUser, locale);
    const sanitized = this.sanitizeOrgQuickReplyTemplates(templatesInput);
    const existing = await this.companyMessagingSettingsRepository.findOne({
      where: { companyId: authenticatedUser.companyId },
    });
    if (existing) {
      existing.orgQuickReplyTemplates = sanitized;
      await this.companyMessagingSettingsRepository.save(existing);
    } else {
      await this.companyMessagingSettingsRepository.save(
        this.companyMessagingSettingsRepository.create({
          companyId: authenticatedUser.companyId,
          orgQuickReplyTemplates: sanitized,
        }),
      );
    }
    return { templates: sanitized };
  }

  public async applyOperationStamp(
    authenticatedUser: AuthenticatedUserContext,
    threadId: string,
    messageId: string,
    stampType: MessagingOperationStampType,
    locale: string,
    clientContext?: MessagingClientRequestContext,
    auditPath?: string,
  ): Promise<{ stampType: MessagingOperationStampType; messageId: string }> {
    const thread = await this.requireParticipantThread(
      authenticatedUser,
      threadId,
      locale,
    );
    const message = await this.messageRepository.findOne({
      where: { id: messageId, threadId: thread.id },
    });
    if (!message) {
      throw new MessagingThreadNotFoundException(messageId);
    }
    if (message.deletedAt) {
      throw new ValidationException("Silinmiş mesaja damga eklenemez");
    }
    if (message.kind === "internal") {
      throw new ValidationException("İç notlara damga eklenemez");
    }
    if (message.senderCompanyId === authenticatedUser.companyId) {
      throw new ValidationException(
        "Kendi mesajınıza işlem damgası ekleyemezsiniz",
      );
    }
    const allowed: MessagingOperationStampType[] = [
      "approved",
      "rejected",
      "acknowledged",
    ];
    if (!allowed.includes(stampType)) {
      throw new ValidationException("Geçersiz damga türü");
    }
    const existing = await this.messageOperationStampRepository.findOne({
      where: {
        messageId: message.id,
        stampedByCompanyId: authenticatedUser.companyId,
      },
    });
    if (existing) {
      existing.stampType = stampType;
      existing.stampedByUserId = authenticatedUser.userId;
      await this.messageOperationStampRepository.save(existing);
    } else {
      await this.messageOperationStampRepository.save(
        this.messageOperationStampRepository.create({
          messageId: message.id,
          threadId: thread.id,
          stampType,
          stampedByUserId: authenticatedUser.userId,
          stampedByCompanyId: authenticatedUser.companyId,
        }),
      );
    }
    if (clientContext) {
      await this.messagingAuditService.recordMessageMutation(
        MessagingAuditActionCode.MessageStamp,
        authenticatedUser,
        clientContext,
        {
          threadId: thread.id,
          messageId: message.id,
          httpMethod: "POST",
          requestPath:
            auditPath ??
            `/messaging/threads/${threadId}/messages/${messageId}/stamp`,
          extra: { stampType },
        },
      );
    }
    const event = { type: "message", threadId: thread.id };
    await this.fanOutRealtime(thread, event);
    await this.fanOutWebhook(thread, "message.stamped", {
      threadId: thread.id,
      messageId: message.id,
      stampType,
      stampedByCompanyId: authenticatedUser.companyId,
      stampedByUserId: authenticatedUser.userId,
    });
    return { stampType, messageId: message.id };
  }

  public async listThreadParticipants(
    authenticatedUser: AuthenticatedUserContext,
    threadId: string,
    locale: string,
  ): Promise<{
    participants: {
      companyId: string;
      legalName: string | null;
      participantRole: string;
    }[];
  }> {
    const thread = await this.requireParticipantThread(
      authenticatedUser,
      threadId,
      locale,
    );
    let rows: { companyId: string; participantRole: string }[];
    if (thread.threadKind === "group") {
      const detailed =
        await this.messagingThreadParticipantService.listParticipantsDetailed(
          thread.id,
        );
      rows = detailed.map((row) => ({
        companyId: row.companyId,
        participantRole: row.participantRole,
      }));
    } else {
      rows = [
        { companyId: thread.companyAId, participantRole: "observer" },
        { companyId: thread.companyBId, participantRole: "observer" },
      ];
    }
    const companies =
      rows.length > 0
        ? await this.companyRepository.find({
            where: { id: In(rows.map((row) => row.companyId)) },
          })
        : [];
    const nameById = new Map(
      companies.map((row) => [
        row.id,
        row.legalName?.trim() || row.id.slice(0, 8),
      ]),
    );
    return {
      participants: rows.map((row) => ({
        companyId: row.companyId,
        legalName: nameById.get(row.companyId) ?? null,
        participantRole: row.participantRole,
      })),
    };
  }

  private async loadOrgQuickReplyTemplates(
    companyId: string,
  ): Promise<ReturnType<typeof listMessagingQuickReplies>> {
    const row = await this.companyMessagingSettingsRepository.findOne({
      where: { companyId },
    });
    const org = row?.orgQuickReplyTemplates ?? [];
    return org.map((template) => ({
      id: template.id,
      labelTr: template.labelTr,
      bodyText: template.bodyText,
      scope: "organization" as const,
    }));
  }

  private sanitizeOrgQuickReplyTemplates(
    templatesInput: CompanyOrgQuickReplyTemplate[],
  ): CompanyOrgQuickReplyTemplate[] {
    const list = Array.isArray(templatesInput) ? templatesInput : [];
    const sanitized: CompanyOrgQuickReplyTemplate[] = [];
    for (const raw of list.slice(0, 20)) {
      const labelTr = raw.labelTr?.trim() ?? "";
      const bodyText = raw.bodyText?.trim() ?? "";
      if (!labelTr || !bodyText) {
        continue;
      }
      const id =
        typeof raw.id === "string" && raw.id.trim().length > 0
          ? raw.id.trim()
          : randomUUID();
      sanitized.push({
        id,
        labelTr: labelTr.slice(0, 80),
        labelEn: raw.labelEn?.trim().slice(0, 80) || undefined,
        bodyText: bodyText.slice(0, 4000),
        category: raw.category?.trim().slice(0, 40) || undefined,
      });
    }
    return sanitized;
  }

  public async getMessagingHubDefault(
    authenticatedUser: AuthenticatedUserContext,
    locale: string,
  ): Promise<{ defaultTab: "email" | "chat" }> {
    await this.assertMessagingModule(authenticatedUser, locale);
    const row = await this.companyMessagingSettingsRepository.findOne({
      where: { companyId: authenticatedUser.companyId },
    });
    const raw = row?.defaultHubTab?.trim().toLowerCase();
    const defaultTab = raw === "chat" || raw === "sohbet" ? "chat" : "email";
    return { defaultTab };
  }

  public async updateMessagingHubDefault(
    authenticatedUser: AuthenticatedUserContext,
    locale: string,
    defaultTab: "email" | "chat",
  ): Promise<{ defaultTab: "email" | "chat" }> {
    if (!authenticatedUser.roleCodes.includes(CompanyRoleCode.CompanyOwner)) {
      throw new AuthorizationException(
        "Yalnızca şirket sahibi varsayılan sekme ayarını değiştirebilir",
      );
    }
    await this.assertMessagingModule(authenticatedUser, locale);
    const existing = await this.companyMessagingSettingsRepository.findOne({
      where: { companyId: authenticatedUser.companyId },
    });
    if (existing) {
      existing.defaultHubTab = defaultTab;
      await this.companyMessagingSettingsRepository.save(existing);
    } else {
      await this.companyMessagingSettingsRepository.save(
        this.companyMessagingSettingsRepository.create({
          companyId: authenticatedUser.companyId,
          defaultHubTab: defaultTab,
        }),
      );
    }
    return { defaultTab };
  }

  public async searchCompanies(
    authenticatedUser: AuthenticatedUserContext,
    locale: string,
    query: string,
    limit = 15,
  ): Promise<{
    query: string;
    companies: {
      companyId: string;
      legalName: string;
      countryCode: string;
      participantTypeCode: string | null;
      trustScoreValue: number;
      trustReviewCount: number;
      hasExistingThread: boolean;
    }[];
  }> {
    await this.assertMessagingModule(authenticatedUser, locale);
    const term = query.trim();
    if (term.length < 3 && !COMPANY_UUID_SEARCH_RE.test(term)) {
      throw new ValidationException("Firma araması en az 3 karakter olmalı");
    }
    const capped = Math.min(Math.max(limit, 1), 25);
    const selfId = authenticatedUser.companyId;

    const counterparties = await this.messageThreadRepository
      .createQueryBuilder("thread")
      .select(["thread.companyAId", "thread.companyBId"])
      .where("thread.companyAId = :selfId OR thread.companyBId = :selfId", {
        selfId,
      })
      .getMany();
    const existingThreadPartnerIds = new Set<string>();
    for (const thread of counterparties) {
      const other =
        thread.companyAId === selfId ? thread.companyBId : thread.companyAId;
      if (other) {
        existingThreadPartnerIds.add(other);
      }
    }

    let companies: CompanyEntity[] = [];
    if (COMPANY_UUID_SEARCH_RE.test(term)) {
      const byId = await this.companyRepository.findOne({
        where: { id: term },
      });
      if (byId && byId.id !== selfId) {
        companies = [byId];
      }
    } else {
      const escaped = escapeIlikeFragment(term);
      const prefix = `${escaped}%`;
      const contains = `%${escaped}%`;
      companies = await this.companyRepository
        .createQueryBuilder("company")
        .where("company.id != :selfId", { selfId })
        .andWhere(
          new Brackets((qb) => {
            qb.where("company.legalName ILIKE :prefix ESCAPE '\\'", {
              prefix,
            }).orWhere("company.legalName ILIKE :contains ESCAPE '\\'", {
              contains,
            });
          }),
        )
        .orderBy("company.legalName", "ASC")
        .take(capped)
        .getMany();
    }

    const trustSnapshots = await Promise.all(
      companies.map((row) =>
        this.trustScoreApplicationService
          .getCompanyTrustSnapshot(row.id)
          .catch(() => null),
      ),
    );

    return {
      query: term,
      companies: companies.map((row, index) => {
        const trust = trustSnapshots[index];
        return {
          companyId: row.id,
          legalName: row.legalName,
          countryCode: row.countryCode,
          participantTypeCode: row.participantTypeCode,
          trustScoreValue: trust?.scoreValue ?? 0,
          trustReviewCount: trust?.reviewCount ?? 0,
          hasExistingThread: existingThreadPartnerIds.has(row.id),
        };
      }),
    };
  }

  public async searchMessages(
    authenticatedUser: AuthenticatedUserContext,
    locale: string,
    query: string,
    limit = 40,
  ): Promise<{
    query: string;
    results: {
      kind: "message";
      threadId: string;
      messageId: string;
      snippet: string;
      counterpartyCompanyId: string;
      counterpartyLegalName: string | null;
      createdAt: string;
    }[];
  }> {
    await this.modularSubscriptionEntitlementService.assertModuleAccess(
      authenticatedUser.companyId,
      SubscriptionModuleCode.Messaging,
      locale,
    );
    const term = query.trim();
    if (term.length < 2) {
      throw new ValidationException("Arama en az 2 karakter olmalı");
    }
    const capped = Math.min(Math.max(limit, 1), 80);
    const rows = await this.messageRepository
      .createQueryBuilder("message")
      .innerJoin(MessageThreadEntity, "thread", "thread.id = message.threadId")
      .where(
        "(thread.companyAId = :companyId OR thread.companyBId = :companyId)",
        { companyId: authenticatedUser.companyId },
      )
      .andWhere("message.bodyText ILIKE :q", { q: `%${term}%` })
      .orderBy("message.createdAt", "DESC")
      .take(capped)
      .getMany();

    const threadIds = [...new Set(rows.map((row) => row.threadId))];
    const threads = threadIds.length
      ? await this.messageThreadRepository.find({
          where: { id: In(threadIds) },
        })
      : [];
    const threadMap = new Map(threads.map((row) => [row.id, row]));
    const counterpartyIds = threads.map((thread) =>
      thread.companyAId === authenticatedUser.companyId
        ? thread.companyBId
        : thread.companyAId,
    );
    const companies = counterpartyIds.length
      ? await this.companyRepository.find({
          where: { id: In(counterpartyIds) },
        })
      : [];
    const companyMap = new Map(companies.map((row) => [row.id, row]));

    const results = rows.map((message) => {
      const thread = threadMap.get(message.threadId);
      const counterpartyId =
        thread && thread.companyAId === authenticatedUser.companyId
          ? thread.companyBId
          : thread?.companyAId ?? "";
      const company = companyMap.get(counterpartyId);
      const idx = message.bodyText.toLowerCase().indexOf(term.toLowerCase());
      const start = Math.max(0, idx - 40);
      const snippet = message.bodyText.slice(start, start + 140);
      return {
        kind: "message" as const,
        threadId: message.threadId,
        messageId: message.id,
        snippet,
        counterpartyCompanyId: counterpartyId,
        counterpartyLegalName: company?.legalName ?? null,
        createdAt: message.createdAt.toISOString(),
      };
    });

    return { query: term, results };
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
        legalHoldActive: Boolean(thread.legalHoldAt),
        legalHoldAt: thread.legalHoldAt?.toISOString() ?? null,
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

  public async editMessage(
    authenticatedUser: AuthenticatedUserContext,
    threadId: string,
    messageId: string,
    bodyText: string,
    locale: string,
    clientContext?: MessagingClientRequestContext,
    auditPath?: string,
  ): Promise<MessageEntity> {
    const thread = await this.requireParticipantThread(
      authenticatedUser,
      threadId,
      locale,
    );
    const message = await this.messageRepository.findOne({
      where: { id: messageId, threadId: thread.id },
    });
    if (!message || message.deletedAt) {
      throw new MessagingThreadNotFoundException(messageId);
    }
    if (message.senderUserId !== authenticatedUser.userId) {
      throw new AuthorizationException("Only sender can edit message");
    }
    const ageMs = Date.now() - message.createdAt.getTime();
    if (ageMs > 5 * 60 * 1000) {
      throw new ValidationException("Düzenleme süresi doldu (5 dk)");
    }
    const trimmed = bodyText.trim();
    if (!trimmed) {
      throw new ValidationException("Mesaj boş olamaz");
    }
    message.bodyText = trimmed;
    message.editedAt = new Date();
    message.mentionUserIds = parseMessagingMentionUserIds(trimmed);
    const saved = await this.messageRepository.save(message);
    const event = { type: "message", threadId: thread.id };
    await this.fanOutRealtime(thread, event);
    if (clientContext) {
      void this.messagingAuditService.recordMessageMutation(
        MessagingAuditActionCode.MessageUpdate,
        authenticatedUser,
        clientContext,
        {
          threadId: thread.id,
          messageId: saved.id,
          httpMethod: "PATCH",
          requestPath:
            auditPath ??
            `/messaging/threads/${threadId}/messages/${messageId}`,
        },
      );
    }
    return saved;
  }

  public async softDeleteMessage(
    authenticatedUser: AuthenticatedUserContext,
    threadId: string,
    messageId: string,
    locale: string,
    clientContext?: MessagingClientRequestContext,
    auditPath?: string,
  ): Promise<void> {
    const thread = await this.requireParticipantThread(
      authenticatedUser,
      threadId,
      locale,
    );
    const message = await this.messageRepository.findOne({
      where: { id: messageId, threadId: thread.id },
    });
    if (!message || message.deletedAt) {
      throw new MessagingThreadNotFoundException(messageId);
    }
    if (message.senderUserId !== authenticatedUser.userId) {
      throw new AuthorizationException("Only sender can delete message");
    }
    if (thread.legalHoldAt) {
      throw new ValidationException(
        "Bu sohbet legal hold altında; mesaj silinemez.",
      );
    }
    message.deletedAt = new Date();
    await this.messageRepository.save(message);
    const event = { type: "message", threadId: thread.id };
    await this.fanOutRealtime(thread, event);
    if (clientContext) {
      void this.messagingAuditService.recordMessageMutation(
        MessagingAuditActionCode.MessageDelete,
        authenticatedUser,
        clientContext,
        {
          threadId: thread.id,
          messageId: message.id,
          httpMethod: "DELETE",
          requestPath:
            auditPath ??
            `/messaging/threads/${threadId}/messages/${messageId}`,
        },
      );
    }
  }

  public async recordTyping(
    authenticatedUser: AuthenticatedUserContext,
    threadId: string,
    locale: string,
  ): Promise<void> {
    const thread = await this.requireParticipantThread(
      authenticatedUser,
      threadId,
      locale,
    );
    const payload = {
      type: "typing",
      threadId: thread.id,
      userId: authenticatedUser.userId,
      companyId: authenticatedUser.companyId,
    };
    const targets =
      await this.messagingThreadParticipantService.listCompanyIds(thread);
    for (const companyId of targets) {
      if (companyId !== authenticatedUser.companyId) {
        this.messagingRealtimeHubService.publish(companyId, payload);
      }
    }
  }

  public async listColleagues(
    authenticatedUser: AuthenticatedUserContext,
    locale: string,
  ): Promise<
    { userId: string; displayName: string; mentionToken: string }[]
  > {
    await this.assertMessagingModule(authenticatedUser, locale);
    const memberships = await this.companyMembershipRepository.find({
      where: { companyId: authenticatedUser.companyId },
    });
    if (memberships.length === 0) {
      return [];
    }
    const users = await this.userAccountRepository.find({
      where: { id: In(memberships.map((row) => row.userId)) },
    });
    return users.map((user) => ({
      userId: user.id,
      displayName: user.displayName?.trim() || user.emailAddress,
      mentionToken: `@{${user.id}}`,
    }));
  }

  private async upsertUserReadState(
    threadId: string,
    userId: string,
    companyId: string,
    lastReadAt: Date,
  ): Promise<void> {
    const existing = await this.userReadStateRepository.findOne({
      where: { threadId, userId },
    });
    if (existing) {
      if (
        !existing.lastReadAt ||
        existing.lastReadAt.getTime() < lastReadAt.getTime()
      ) {
        existing.lastReadAt = lastReadAt;
        await this.userReadStateRepository.save(existing);
      }
      return;
    }
    await this.userReadStateRepository.save(
      this.userReadStateRepository.create({
        threadId,
        userId,
        companyId,
        lastReadAt,
      }),
    );
  }

  public async recordExternalChannelInbound(params: {
    companyId: string;
    threadId: string;
    bodyText: string;
    senderDisplayName: string;
  }): Promise<MessageEntity> {
    const thread = await this.messageThreadRepository.findOne({
      where: { id: params.threadId },
    });
    if (
      !thread ||
      thread.threadKind !== "external_social" ||
      thread.companyAId !== params.companyId
    ) {
      throw new ValidationException("Geçersiz sosyal konuşma");
    }
    const trimmed = params.bodyText.trim();
    const saved = await this.messageRepository.save(
      this.messageRepository.create({
        threadId: thread.id,
        senderCompanyId: thread.companyBId,
        senderUserId: EXTERNAL_INBOUND_SENDER_USER_ID,
        bodyText: trimmed,
        kind: "public",
        deletedAt: null,
        editedAt: null,
        mentionUserIds: null,
        attachments: null,
      }),
    );
    void this.messagingWebPushService.notifyNewChatMessage({
      companyId: thread.companyAId,
      threadId: thread.id,
      senderCompanyName: params.senderDisplayName,
      bodyPreview: trimmed.slice(0, 280),
      freightListingId: thread.freightListingId,
    });
    void this.fanOutRealtime(thread, {
      type: "message.created",
      threadId: thread.id,
    });
    return saved;
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
    const isParticipant =
      await this.messagingThreadParticipantService.isParticipant(
        thread,
        authenticatedUser.companyId,
      );
    if (!isParticipant) {
      throw new AuthorizationException("Thread access denied");
    }
    return thread;
  }

  private resolveCounterpartyCompanyId(
    thread: MessageThreadEntity,
    viewerCompanyId: string,
  ): string {
    if (thread.threadKind === "external_social") {
      return thread.companyBId;
    }
    if (thread.threadKind === "group") {
      return thread.companyAId === viewerCompanyId
        ? thread.companyBId
        : thread.companyAId;
    }
    return thread.companyAId === viewerCompanyId
      ? thread.companyBId
      : thread.companyAId;
  }

  private async fanOutRealtime(
    thread: MessageThreadEntity,
    event: { type: string; threadId?: string },
  ): Promise<void> {
    const companyIds =
      await this.messagingThreadParticipantService.listCompanyIds(thread);
    for (const companyId of companyIds) {
      this.messagingRealtimeHubService.publish(companyId, event);
    }
  }

  private async fanOutWebhook(
    thread: MessageThreadEntity,
    event: "message.created" | "thread.opened" | "message.stamped",
    payload: Record<string, unknown>,
  ): Promise<void> {
    const companyIds =
      await this.messagingThreadParticipantService.listCompanyIds(thread);
    for (const companyId of companyIds) {
      this.messagingWebhookDispatcherService.dispatch(companyId, event, payload);
    }
  }

  private async fanOutNotifyBridges(
    thread: MessageThreadEntity,
    payload: {
      threadId: string;
      messageId: string;
      bodyPreview: string;
      senderCompanyId: string;
      freightListingId: string | null;
    },
  ): Promise<void> {
    const companyIds =
      await this.messagingThreadParticipantService.listCompanyIds(thread);
    for (const companyId of companyIds) {
      this.messagingSlackBridgeService.notifyMessageCreated(companyId, payload);
      this.messagingWhatsappBridgeService.notifyMessageCreated(companyId, {
        threadId: payload.threadId,
        bodyPreview: payload.bodyPreview,
      });
    }
  }

  private async countUnreadMessages(
    threadId: string,
    viewerCompanyId: string,
    lastReadAt: Date | null | undefined,
  ): Promise<number> {
    const qb = this.messageRepository
      .createQueryBuilder("message")
      .where("message.threadId = :threadId", { threadId })
      .andWhere("message.senderCompanyId != :viewerCompanyId", {
        viewerCompanyId,
      });
    if (lastReadAt) {
      qb.andWhere("message.createdAt > :lastReadAt", { lastReadAt });
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
