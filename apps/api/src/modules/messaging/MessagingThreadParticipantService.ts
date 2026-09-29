import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { MessageThreadEntity } from "../../infrastructure/database/entities/MessageThreadEntity";
import { MessageThreadParticipantEntity } from "../../infrastructure/database/entities/MessageThreadParticipantEntity";

@Injectable()
export class MessagingThreadParticipantService {
  public constructor(
    @InjectRepository(MessageThreadParticipantEntity)
    private readonly participantRepository: Repository<MessageThreadParticipantEntity>,
  ) {}

  public async listCompanyIds(thread: MessageThreadEntity): Promise<string[]> {
    if (thread.threadKind !== "group") {
      return [thread.companyAId, thread.companyBId];
    }
    const rows = await this.participantRepository.find({
      where: { threadId: thread.id },
    });
    if (rows.length === 0) {
      return [thread.companyAId, thread.companyBId];
    }
    return rows.map((row) => row.companyId);
  }

  public async isParticipant(
    thread: MessageThreadEntity,
    companyId: string,
  ): Promise<boolean> {
    if (thread.threadKind !== "group") {
      return (
        thread.companyAId === companyId || thread.companyBId === companyId
      );
    }
    const row = await this.participantRepository.findOne({
      where: { threadId: thread.id, companyId },
    });
    return row !== null;
  }

  public async addParticipants(
    threadId: string,
    companyIds: string[],
  ): Promise<void> {
    const unique = [...new Set(companyIds)];
    if (unique.length === 0) {
      return;
    }
    await this.participantRepository.save(
      unique.map((companyId) =>
        this.participantRepository.create({ threadId, companyId }),
      ),
    );
  }

  public async listGroupThreadIdsForCompany(companyId: string): Promise<string[]> {
    const rows = await this.participantRepository.find({
      where: { companyId },
    });
    return rows.map((row) => row.threadId);
  }

  public async listParticipants(threadId: string): Promise<string[]> {
    const rows = await this.participantRepository.find({
      where: { threadId },
    });
    return rows.map((row) => row.companyId);
  }

  public async findGroupThreadsForCompanies(
    companyIds: string[],
    freightListingId: string | null,
    title: string | null,
  ): Promise<MessageThreadEntity | null> {
    if (companyIds.length < 3) {
      return null;
    }
    const candidateIds = await this.participantRepository
      .createQueryBuilder("participant")
      .select("participant.threadId", "threadId")
      .where("participant.companyId IN (:...companyIds)", { companyIds })
      .groupBy("participant.threadId")
      .having("COUNT(*) = :count", { count: companyIds.length })
      .getRawMany<{ threadId: string }>();
    if (candidateIds.length === 0) {
      return null;
    }
    const threadRepo = this.participantRepository.manager.getRepository(
      MessageThreadEntity,
    );
    for (const row of candidateIds) {
      const thread = await threadRepo.findOne({ where: { id: row.threadId } });
      if (!thread || thread.threadKind !== "group") {
        continue;
      }
      if ((thread.freightListingId ?? null) !== freightListingId) {
        continue;
      }
      if (title && thread.title !== title) {
        continue;
      }
      const participants = await this.listParticipants(thread.id);
      if (
        participants.length === companyIds.length &&
        companyIds.every((id) => participants.includes(id))
      ) {
        return thread;
      }
    }
    return null;
  }
}
