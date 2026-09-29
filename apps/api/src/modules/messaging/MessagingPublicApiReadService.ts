import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MessageThreadEntity } from "../../infrastructure/database/entities/MessageThreadEntity";
import { MessageEntity } from "../../infrastructure/database/entities/MessageEntity";

@Injectable()
export class MessagingPublicApiReadService {
  public constructor(
    @InjectRepository(MessageThreadEntity)
    private readonly threadRepository: Repository<MessageThreadEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
  ) {}

  public async listThreads(companyId: string, limit: number) {
    const capped = Math.min(Math.max(limit, 1), 200);
    const threads = await this.threadRepository
      .createQueryBuilder("thread")
      .where("thread.companyAId = :companyId OR thread.companyBId = :companyId", {
        companyId,
      })
      .orderBy("thread.createdAt", "DESC")
      .take(capped)
      .getMany();
    return {
      companyId,
      threads: threads.map((thread) => ({
        id: thread.id,
        companyAId: thread.companyAId,
        companyBId: thread.companyBId,
        freightListingId: thread.freightListingId,
        legalHoldAt: thread.legalHoldAt?.toISOString() ?? null,
        createdAt: thread.createdAt.toISOString(),
      })),
    };
  }

  public async listMessages(
    companyId: string,
    threadId: string,
    limit: number,
  ) {
    const thread = await this.threadRepository.findOne({
      where: { id: threadId },
    });
    if (
      !thread ||
      (thread.companyAId !== companyId && thread.companyBId !== companyId)
    ) {
      throw new NotFoundException("Thread not found");
    }
    const capped = Math.min(Math.max(limit, 1), 500);
    const messages = await this.messageRepository.find({
      where: { threadId: thread.id },
      order: { createdAt: "ASC" },
      take: capped,
    });
    return {
      threadId: thread.id,
      messages: messages
        .filter((row) => row.kind !== "internal" || row.senderCompanyId === companyId)
        .map((row) => ({
          id: row.id,
          senderCompanyId: row.senderCompanyId,
          senderUserId: row.senderUserId,
          bodyText: row.deletedAt ? "" : row.bodyText,
          kind: row.kind ?? "public",
          createdAt: row.createdAt.toISOString(),
          deletedAt: row.deletedAt?.toISOString() ?? null,
        })),
    };
  }
}
