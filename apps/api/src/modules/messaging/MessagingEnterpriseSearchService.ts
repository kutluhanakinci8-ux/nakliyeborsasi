import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import {
  AuthorizationException,
  CompanyRoleCode,
} from "@nakliyeborsasi/core";
import type { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { MessageEntity } from "../../infrastructure/database/entities/MessageEntity";
import { CompanyEntity } from "../../infrastructure/database/entities/CompanyEntity";

export type MessagingSearchHit = {
  threadId: string;
  messageId: string;
  threadKind: "b2b" | "org_channel";
  channelSlug: string | null;
  channelName: string | null;
  counterpartyLegalName: string | null;
  bodySnippet: string;
  createdAt: string;
};

@Injectable()
export class MessagingEnterpriseSearchService {
  public constructor(
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,
  ) {}

  public async searchCompanyMessages(
    user: AuthenticatedUserContext,
    query: string,
    limit = 40,
  ): Promise<{ hits: MessagingSearchHit[]; query: string }> {
    const q = query.trim();
    if (q.length < 2) {
      return { hits: [], query: q };
    }
    const canSearch =
      user.roleCodes.includes(CompanyRoleCode.CompanyOwner) ||
      user.roleCodes.includes(CompanyRoleCode.Viewer);
    if (!canSearch) {
      throw new AuthorizationException(
        "Kurumsal mesaj araması için firma sahibi veya görüntüleyici rolü gerekir",
      );
    }
    const capped = Math.min(Math.max(limit, 1), 80);
    const messages = await this.messageRepository
      .createQueryBuilder("m")
      .innerJoinAndSelect("m.thread", "thread")
      .where(
        "(thread.companyAId = :companyId OR thread.companyBId = :companyId)",
        { companyId: user.companyId },
      )
      .andWhere("m.bodyText ILIKE :q", { q: `%${q}%` })
      .orderBy("m.createdAt", "DESC")
      .take(capped)
      .getMany();

    const counterpartyIds = new Set<string>();
    for (const message of messages) {
      const thread = message.thread;
      if (!thread || thread.threadKind === "org_channel") {
        continue;
      }
      const other =
        thread.companyAId === user.companyId
          ? thread.companyBId
          : thread.companyAId;
      counterpartyIds.add(other);
    }
    const companies =
      counterpartyIds.size > 0
        ? await this.companyRepository.find({
            where: { id: In([...counterpartyIds]) },
          })
        : [];
    const nameById = new Map(companies.map((c) => [c.id, c.legalName]));

    const hits: MessagingSearchHit[] = messages.map((message) => {
      const thread = message.thread;
      const isChannel = thread?.threadKind === "org_channel";
      const counterpartyId =
        !thread || isChannel
          ? null
          : thread.companyAId === user.companyId
            ? thread.companyBId
            : thread.companyAId;
      const text = message.bodyText ?? "";
      const idx = text.toLowerCase().indexOf(q.toLowerCase());
      const start = Math.max(0, idx - 40);
      const snippet =
        (start > 0 ? "…" : "") +
        text.slice(start, start + 160) +
        (start + 160 < text.length ? "…" : "");
      return {
        threadId: message.threadId,
        messageId: message.id,
        threadKind: thread?.threadKind ?? "b2b",
        channelSlug: thread?.channelSlug ?? null,
        channelName: thread?.channelName ?? null,
        counterpartyLegalName: counterpartyId
          ? (nameById.get(counterpartyId) ?? null)
          : null,
        bodySnippet: snippet.trim(),
        createdAt: message.createdAt.toISOString(),
      };
    });

    return { hits, query: q };
  }
}
