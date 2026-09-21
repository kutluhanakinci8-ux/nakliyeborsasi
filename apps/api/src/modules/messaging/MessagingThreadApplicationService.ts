import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
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

@Injectable()
export class MessagingThreadApplicationService {
  public constructor(
    @InjectRepository(MessageThreadEntity)
    private readonly messageThreadRepository: Repository<MessageThreadEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    private readonly modularSubscriptionEntitlementService: ModularSubscriptionEntitlementService,
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
    return threads.map(
      (thread) =>
        new MessagingThreadReference({
          threadId: thread.id,
          counterpartyCompanyId:
            thread.companyAId === authenticatedUser.companyId
              ? thread.companyBId
              : thread.companyAId,
        }),
    );
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
    return this.messageRepository.save(
      this.messageRepository.create({
        threadId: thread.id,
        senderCompanyId: authenticatedUser.companyId,
        senderUserId: authenticatedUser.userId,
        bodyText,
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
