import { Inject, Injectable, forwardRef } from "@nestjs/common";
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
import { AuctionListingPriceActionService } from "../auction/AuctionListingPriceActionService";

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
      }),
    );
    const openedPayload = {
      threadId: created.id,
      companyAId: created.companyAId,
      companyBId: created.companyBId,
      freightListingId: created.freightListingId,
      openedByCompanyId: authenticatedUser.companyId,
      openedByUserId: authenticatedUser.userId,
    };
    this.messagingWebhookDispatcherService.dispatch(
      created.companyAId,
      "thread.opened",
      openedPayload,
    );
    this.messagingWebhookDispatcherService.dispatch(
      created.companyBId,
      "thread.opened",
      openedPayload,
    );
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
      const counterpartyCompanyId =
        thread.companyAId === authenticatedUser.companyId
          ? thread.companyBId
          : thread.companyAId;
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
      enriched.push(
        new MessagingThreadReference({
          threadId: thread.id,
          counterpartyCompanyId,
          counterpartyLegalName:
            companyNameById.get(counterpartyCompanyId) ?? null,
          lastMessagePreview: lastMessage?.bodyText?.slice(0, 120) ?? null,
          lastMessageAt: lastMessage?.createdAt?.toISOString() ?? null,
          freightListingId: thread.freightListingId,
          unreadCount,
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
    const views = visible.map((message) => {
      const isMine = message.senderCompanyId === authenticatedUser.companyId;
      const readByCounterpartyUserIds = isMine
        ? counterpartyUserReads
            .filter(
              (row) =>
                row.lastReadAt &&
                message.createdAt.getTime() <= row.lastReadAt.getTime(),
            )
            .map((row) => row.userId)
        : [];
      const readByRecipient =
        isMine &&
        (readByCounterpartyUserIds.length > 0 ||
          (counterpartyLastReadAt !== null &&
            message.createdAt.getTime() <= counterpartyLastReadAt.getTime()));
      const deleted = Boolean(message.deletedAt);
      return new MessagingThreadMessageView({
        id: message.id,
        senderCompanyId: message.senderCompanyId,
        bodyText: deleted ? "[Mesaj silindi]" : message.bodyText,
        createdAt: message.createdAt.toISOString(),
        readByRecipient,
        readByCounterpartyUserIds,
        messageKind: message.kind ?? "public",
        editedAt: message.editedAt?.toISOString() ?? null,
        deleted,
        mentionUserIds: message.mentionUserIds ?? [],
        attachments: deleted ? [] : this.publicAttachments(message.attachments),
      });
    });
    const latest = visible.at(-1);
    if (latest) {
      await this.upsertReadState(
        thread.id,
        authenticatedUser.companyId,
        latest.createdAt,
      );
      await this.upsertUserReadState(
        thread.id,
        authenticatedUser.userId,
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
    this.messagingRealtimeHubService.publish(thread.companyAId, event);
    this.messagingRealtimeHubService.publish(thread.companyBId, event);
    const createdPayload = {
      threadId: thread.id,
      messageId: saved.id,
      senderCompanyId: saved.senderCompanyId,
      senderUserId: saved.senderUserId,
      messageKind: saved.kind ?? "public",
      freightListingId: thread.freightListingId,
      bodyPreview: preview,
    };
    this.messagingWebhookDispatcherService.dispatch(
      thread.companyAId,
      "message.created",
      createdPayload,
    );
    this.messagingWebhookDispatcherService.dispatch(
      thread.companyBId,
      "message.created",
      createdPayload,
    );
    if (messageKind !== "internal") {
      this.messagingSlackBridgeService.notifyMessageCreated(thread.companyAId, {
        threadId: thread.id,
        messageId: saved.id,
        bodyPreview: preview,
        senderCompanyId: saved.senderCompanyId,
        freightListingId: thread.freightListingId,
      });
      this.messagingSlackBridgeService.notifyMessageCreated(thread.companyBId, {
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
    return { templates: listMessagingQuickReplies() };
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
    this.messagingRealtimeHubService.publish(thread.companyAId, event);
    this.messagingRealtimeHubService.publish(thread.companyBId, event);
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
    this.messagingRealtimeHubService.publish(thread.companyAId, event);
    this.messagingRealtimeHubService.publish(thread.companyBId, event);
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
    const targets = [thread.companyAId, thread.companyBId];
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
      thread.companyAId === authenticatedUser.companyId ||
      thread.companyBId === authenticatedUser.companyId;
    if (!isParticipant) {
      throw new AuthorizationException("Thread access denied");
    }
    return thread;
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
