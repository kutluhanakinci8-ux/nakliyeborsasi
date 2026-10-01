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
  WebhookInboundBridged: "SOCIAL_HUB_WEBHOOK_INBOUND_BRIDGED",
  RoadmapInboxSync: "SOCIAL_HUB_ROADMAP_INBOX_SYNC",
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
    this.appendEntry({
      actorUserId: user.userId,
      actorCompanyId: user.companyId,
      actionCode,
      requestPath,
      metadata: metadata ?? null,
    });
  }

  public recordCompanySystemEvent(
    companyId: string,
    actionCode: string,
    requestPath: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.appendEntry({
      actorUserId: null,
      actorCompanyId: companyId,
      actionCode,
      requestPath,
      metadata: metadata ?? null,
    });
  }

  public async countRecentByAction(
    actionCode: string,
    since: Date,
  ): Promise<number> {
    return this.auditLogRepository
      .createQueryBuilder("log")
      .where("log.actionCode = :actionCode", { actionCode })
      .andWhere("log.createdAt >= :since", { since })
      .getCount();
  }

  public async countRecentByActionForCompany(
    companyId: string,
    actionCode: string,
    since: Date,
  ): Promise<number> {
    return this.auditLogRepository
      .createQueryBuilder("log")
      .where("log.actorCompanyId = :companyId", { companyId })
      .andWhere("log.actionCode = :actionCode", { actionCode })
      .andWhere("log.createdAt >= :since", { since })
      .getCount();
  }

  public async latestCompanyActionAt(
    companyId: string,
    actionCode: string,
  ): Promise<Date | null> {
    const row = await this.auditLogRepository
      .createQueryBuilder("log")
      .where("log.actorCompanyId = :companyId", { companyId })
      .andWhere("log.actionCode = :actionCode", { actionCode })
      .orderBy("log.createdAt", "DESC")
      .getOne();
    return row?.createdAt ?? null;
  }

  public async summarizeWebhookBridgedByPlatform(
    since: Date,
    companyId?: string,
  ): Promise<Array<{ platformCode: string; count: number }>> {
    const qb = this.auditLogRepository
      .createQueryBuilder("log")
      .select("log.metadata->>'platformCode'", "platformCode")
      .addSelect("COUNT(*)", "count")
      .where("log.actionCode = :actionCode", {
        actionCode: SocialHubAuditActionCode.WebhookInboundBridged,
      })
      .andWhere("log.createdAt >= :since", { since });
    if (companyId) {
      qb.andWhere("log.actorCompanyId = :companyId", { companyId });
    }
    const rows = await qb
      .groupBy("log.metadata->>'platformCode'")
      .getRawMany<{ platformCode: string | null; count: string }>();
    return rows
      .filter((row) => row.platformCode)
      .map((row) => ({
        platformCode: row.platformCode!,
        count: Number.parseInt(row.count, 10) || 0,
      }))
      .sort((a, b) => a.platformCode.localeCompare(b.platformCode));
  }

  public async listGlobalRecentByAction(
    actionCode: string,
    limit: number,
  ): Promise<
    Array<{
      id: string;
      actorCompanyId: string | null;
      metadata: Record<string, unknown> | null;
      createdAt: string;
    }>
  > {
    const rows = await this.auditLogRepository
      .createQueryBuilder("log")
      .where("log.actionCode = :actionCode", { actionCode })
      .orderBy("log.createdAt", "DESC")
      .take(limit)
      .getMany();
    return rows.map((row) => ({
      id: row.id,
      actorCompanyId: row.actorCompanyId,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  private appendEntry(params: {
    actorUserId: string | null;
    actorCompanyId: string | null;
    actionCode: string;
    requestPath: string;
    metadata: Record<string, unknown> | null;
  }): void {
    void this.auditLogPersistenceService.appendEntry(
      new AuditLogWriteRequest({
        actorUserId: params.actorUserId,
        actorCompanyId: params.actorCompanyId,
        httpMethod: "POST",
        requestPath: params.requestPath,
        responseStatusCode: 200,
        actionCode: params.actionCode,
        metadata: params.metadata,
      }),
    );
  }

  public async listRecent(
    companyId: string,
    limit = 25,
    actionCodePrefix?: string,
  ) {
    const qb = this.auditLogRepository
      .createQueryBuilder("log")
      .where("log.actorCompanyId = :companyId", { companyId })
      .andWhere("log.actionCode LIKE :prefix", {
        prefix: actionCodePrefix ?? "SOCIAL_HUB_%",
      })
      .orderBy("log.createdAt", "DESC")
      .take(limit);
    const rows = await qb.getMany();
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
