import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CompanySocialOutboundDeliveryEntity } from "../../infrastructure/database/entities/CompanySocialOutboundDeliveryEntity";

export type OutboundDeliveryListFilters = {
  companyId: string;
  messageThreadId?: string;
  platformCode?: string;
  status?: "ok" | "failed";
  since?: Date;
  until?: Date;
  limit: number;
};

@Injectable()
export class SocialHubOutboundDeliveryLogService {
  public constructor(
    @InjectRepository(CompanySocialOutboundDeliveryEntity)
    private readonly deliveryRepository: Repository<CompanySocialOutboundDeliveryEntity>,
  ) {}

  public async record(params: {
    companyId: string;
    messageThreadId: string;
    messageId: string | null;
    platformCode: string;
    status: "ok" | "failed";
    errorMessage: string | null;
    externalMessageId?: string | null;
    bodyTextPreview?: string | null;
  }): Promise<void> {
    await this.deliveryRepository.save(
      this.deliveryRepository.create({
        companyId: params.companyId,
        messageThreadId: params.messageThreadId,
        messageId: params.messageId,
        platformCode: params.platformCode,
        status: params.status,
        errorMessage: params.errorMessage?.slice(0, 512) ?? null,
        externalMessageId: params.externalMessageId ?? null,
        bodyTextPreview: params.bodyTextPreview?.slice(0, 280) ?? null,
      }),
    );
  }

  public async list(
    filters: OutboundDeliveryListFilters,
  ): Promise<CompanySocialOutboundDeliveryEntity[]> {
    const qb = this.deliveryRepository
      .createQueryBuilder("delivery")
      .where("delivery.companyId = :companyId", { companyId: filters.companyId })
      .orderBy("delivery.createdAt", "DESC")
      .take(filters.limit);
    if (filters.messageThreadId) {
      qb.andWhere("delivery.messageThreadId = :threadId", {
        threadId: filters.messageThreadId,
      });
    }
    if (filters.platformCode) {
      qb.andWhere("delivery.platformCode = :platformCode", {
        platformCode: filters.platformCode,
      });
    }
    if (filters.status) {
      qb.andWhere("delivery.status = :status", { status: filters.status });
    }
    if (filters.since) {
      qb.andWhere("delivery.createdAt >= :since", { since: filters.since });
    }
    if (filters.until) {
      qb.andWhere("delivery.createdAt <= :until", { until: filters.until });
    }
    return qb.getMany();
  }

  public async countRecentFailures(
    companyId: string,
    platformCode: string,
    since: Date,
  ): Promise<number> {
    return this.deliveryRepository
      .createQueryBuilder("delivery")
      .where("delivery.companyId = :companyId", { companyId })
      .andWhere("delivery.platformCode = :platformCode", { platformCode })
      .andWhere("delivery.status = :status", { status: "failed" })
      .andWhere("delivery.createdAt >= :since", { since })
      .getCount();
  }

  public buildCsv(rows: CompanySocialOutboundDeliveryEntity[]): string {
    const header =
      "createdAt,platformCode,status,messageThreadId,messageId,bodyTextPreview,errorMessage,externalMessageId";
    const lines = rows.map((row) => {
      const escape = (value: string | null) => {
        const text = value ?? "";
        if (text.includes(",") || text.includes('"') || text.includes("\n")) {
          return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
      };
      return [
        row.createdAt.toISOString(),
        row.platformCode,
        row.status,
        row.messageThreadId,
        row.messageId ?? "",
        escape(row.bodyTextPreview),
        escape(row.errorMessage),
        row.externalMessageId ?? "",
      ].join(",");
    });
    return [header, ...lines].join("\n");
  }
}
