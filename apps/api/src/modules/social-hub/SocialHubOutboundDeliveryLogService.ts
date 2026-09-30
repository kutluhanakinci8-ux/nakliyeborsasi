import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CompanySocialOutboundDeliveryEntity } from "../../infrastructure/database/entities/CompanySocialOutboundDeliveryEntity";

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
      }),
    );
  }

  public async listForCompany(params: {
    companyId: string;
    messageThreadId?: string;
    limit: number;
  }): Promise<CompanySocialOutboundDeliveryEntity[]> {
    const qb = this.deliveryRepository
      .createQueryBuilder("delivery")
      .where("delivery.companyId = :companyId", { companyId: params.companyId })
      .orderBy("delivery.createdAt", "DESC")
      .take(params.limit);
    if (params.messageThreadId) {
      qb.andWhere("delivery.messageThreadId = :threadId", {
        threadId: params.messageThreadId,
      });
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
}
