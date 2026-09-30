import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import type { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { AuditLogEntity } from "../../infrastructure/database/entities/AuditLogEntity";
import { AuditLogPersistenceService } from "../../infrastructure/audit/AuditLogPersistenceService";
import { AuditLogWriteRequest } from "../../infrastructure/audit/AuditLogWriteRequest";

export const SocialHubAuditActionCode = {
  SettingsUpdate: "SOCIAL_HUB_SETTINGS_UPDATE",
  PostPublish: "SOCIAL_HUB_POST_PUBLISH",
  PostApprove: "SOCIAL_HUB_POST_APPROVE",
  PostSubmitApproval: "SOCIAL_HUB_POST_SUBMIT_APPROVAL",
  MemberRoleUpdate: "SOCIAL_HUB_MEMBER_ROLE_UPDATE",
  ConnectionTokenRefresh: "SOCIAL_HUB_CONNECTION_TOKEN_REFRESH",
} as const;

@Injectable()
export class SocialHubAuditService {
  public constructor(
    private readonly auditLogPersistenceService: AuditLogPersistenceService,
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepository: Repository<AuditLogEntity>,
  ) {}

  public record(
    user: AuthenticatedUserContext,
    actionCode: string,
    requestPath: string,
    metadata?: Record<string, unknown>,
  ): void {
    void this.auditLogPersistenceService.appendEntry(
      new AuditLogWriteRequest({
        actorUserId: user.userId,
        actorCompanyId: user.companyId,
        httpMethod: "POST",
        requestPath,
        responseStatusCode: 200,
        actionCode,
        metadata: metadata ?? null,
      }),
    );
  }

  public async listRecent(companyId: string, limit = 25) {
    const rows = await this.auditLogRepository
      .createQueryBuilder("log")
      .where("log.actorCompanyId = :companyId", { companyId })
      .andWhere("log.actionCode LIKE :prefix", { prefix: "SOCIAL_HUB_%" })
      .orderBy("log.createdAt", "DESC")
      .take(limit)
      .getMany();
    return rows.map((row) => ({
      id: row.id,
      actionCode: row.actionCode,
      requestPath: row.requestPath,
      actorUserId: row.actorUserId,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString(),
    }));
  }
}
