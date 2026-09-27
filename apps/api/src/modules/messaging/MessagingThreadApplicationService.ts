import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Repository } from "typeorm";
import {
  AuthenticatedUserContext,
  AuthorizationException,
  MessagingThreadNotFoundException,
  MessagingThreadReference,
  SubscriptionModuleCode,
  ValidationException,
} from "@nakliyeborsasi/core";
import { MessageThreadEntity } from "../../infrastructure/database/entities/MessageThreadEntity";
import { MessageEntity } from "../../infrastructure/database/entities/MessageEntity";
import { OpenMessagingThreadRequestDto } from "./OpenMessagingThreadRequestDto";
import { ModularSubscriptionEntitlementService } from "../subscription/ModularSubscriptionEntitlementService";
import { OperationalNotificationService } from "../notification/OperationalNotificationService";
import { CompanyEntity } from "../../infrastructure/database/entities/CompanyEntity";

@Injectable()
export class MessagingThreadApplicationService {
  public constructor(
    @InjectRepository(MessageThreadEntity)
    private readonly messageThreadRepository: Repository<MessageThreadEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,
    private readonly modularSubscriptionEntitlementService: ModularSubscriptionEntitlementService,
    private readonly operationalNotificationService: OperationalNotificationService,
  ) {}

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
      enriched.push(
        new MessagingThreadReference({
          threadId: thread.id,
          counterpartyCompanyId,
          counterpartyLegalName:
            companyNameById.get(counterpartyCompanyId) ?? null,
          lastMessagePreview: lastMessage?.bodyText?.slice(0, 120) ?? null,
          lastMessageAt: lastMessage?.createdAt?.toISOString() ?? null,
          freightListingId: thread.freightListingId,
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
  ): Promise<MessageEntity[]> {
    const thread = await this.requireParticipantThread(
      authenticatedUser,
      threadId,
      locale,
    );
    return this.messageRepository.find({
      where: { threadId: thread.id },
      order: { createdAt: "ASC" },
    });
  }

  public async sendMessage(
    authenticatedUser: AuthenticatedUserContext,
    threadId: string,
    bodyText: string,
    locale: string,
  ): Promise<MessageEntity> {
    const thread = await this.requireParticipantThread(
      authenticatedUser,
      threadId,
      locale,
    );
    const saved = await this.messageRepository.save(
      this.messageRepository.create({
        threadId: thread.id,
        senderCompanyId: authenticatedUser.companyId,
        senderUserId: authenticatedUser.userId,
        bodyText,
      }),
    );
    const counterpartyCompanyId =
      thread.companyAId === authenticatedUser.companyId
        ? thread.companyBId
        : thread.companyAId;
    const senderCompany = await this.companyRepository.findOne({
      where: { id: authenticatedUser.companyId },
    });
    void this.operationalNotificationService.afterMessagingMessageSent({
      threadId: thread.id,
      counterpartyCompanyId,
      senderCompanyId: authenticatedUser.companyId,
      senderCompanyName:
        senderCompany?.legalName?.trim() || authenticatedUser.companyId,
      messageId: saved.id,
      bodyPreview: bodyText.trim().slice(0, 280),
      freightListingId: thread.freightListingId,
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
      thread.companyAId === authenticatedUser.companyId ||
      thread.companyBId === authenticatedUser.companyId;
    if (!isParticipant) {
      throw new AuthorizationException("Thread access denied");
    }
    return thread;
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
