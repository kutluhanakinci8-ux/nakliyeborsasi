import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Like, Repository } from "typeorm";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { AuditLogEntity } from "../../infrastructure/database/entities/AuditLogEntity";
import { UserAccountEntity } from "../../infrastructure/database/entities/UserAccountEntity";
import { AuditLogPersistenceService } from "../../infrastructure/audit/AuditLogPersistenceService";
import { AuditLogWriteRequest } from "../../infrastructure/audit/AuditLogWriteRequest";
import {
  mailAuditLabelTr,
  mailAuditSummaryTr,
} from "./MailIdentityAuditPresentation";

export const MailIdentityAuditAction = {
  CustomDomainRegistered: "MAIL_IDENTITY_CUSTOM_DOMAIN_REGISTERED",
  CustomDomainDnsVerified: "MAIL_IDENTITY_CUSTOM_DOMAIN_DNS_VERIFIED",
  CustomDomainDnsFailed: "MAIL_IDENTITY_CUSTOM_DOMAIN_DNS_FAILED",
  SenderProvisioned: "MAIL_IDENTITY_SENDER_PROVISIONED",
  DisplayNameUpdated: "MAIL_IDENTITY_DISPLAY_NAME_UPDATED",
  SuppressionAdded: "MAIL_IDENTITY_SUPPRESSION_ADDED",
  SuppressionRemoved: "MAIL_IDENTITY_SUPPRESSION_REMOVED",
  TenantSubdomainProvisioned: "MAIL_IDENTITY_TENANT_SUBDOMAIN_PROVISIONED",
  TenantSubdomainDnsVerified: "MAIL_IDENTITY_TENANT_SUBDOMAIN_DNS_VERIFIED",
  AdminDomainCreated: "MAIL_IDENTITY_ADMIN_DOMAIN_CREATED",
  AdminDomainDnsVerified: "MAIL_IDENTITY_ADMIN_DOMAIN_DNS_VERIFIED",
  AdminDomainManuallyVerified: "MAIL_IDENTITY_ADMIN_DOMAIN_MANUAL_VERIFIED",
  TenantSuspended: "MAIL_TENANT_SUSPENDED",
  TenantUnsuspended: "MAIL_TENANT_UNSUSPENDED",
  PrivacyDataExport: "MAIL_PRIVACY_DATA_EXPORT",
  PrivacyDeletionRequested: "MAIL_PRIVACY_DELETION_REQUESTED",
  PrivacyDeletionCompleted: "MAIL_PRIVACY_DELETION_COMPLETED",
  PrivacyDeletionCancelled: "MAIL_PRIVACY_DELETION_CANCELLED",
  DefaultSenderSet: "MAIL_IDENTITY_DEFAULT_SENDER_SET",
  SubscriptionPlanSelected: "MAIL_SUBSCRIPTION_PLAN_SELECTED",
  TeamInviteCreated: "MAIL_TEAM_INVITE_CREATED",
  TeamInviteRevoked: "MAIL_TEAM_INVITE_REVOKED",
  TeamInviteAccepted: "MAIL_TEAM_INVITE_ACCEPTED",
  TeamMemberRoleChanged: "MAIL_TEAM_MEMBER_ROLE_CHANGED",
  TeamMemberRemoved: "MAIL_TEAM_MEMBER_REMOVED",
  SecurityRequireTotpUpdated: "MAIL_SECURITY_REQUIRE_TOTP_UPDATED",
  SecurityTotpEnabled: "MAIL_SECURITY_TOTP_ENABLED",
  SecurityTotpDisabled: "MAIL_SECURITY_TOTP_DISABLED",
  BrandingUpdated: "MAIL_BRANDING_UPDATED",
  IntegrationApiKeyCreated: "MAIL_INTEGRATION_API_KEY_CREATED",
  IntegrationApiKeyRevoked: "MAIL_INTEGRATION_API_KEY_REVOKED",
  IntegrationWebhookCreated: "MAIL_INTEGRATION_WEBHOOK_CREATED",
  IntegrationWebhookUpdated: "MAIL_INTEGRATION_WEBHOOK_UPDATED",
} as const;

export type MailTenantAuditLogDto = {
  id: string;
  actionCode: string;
  labelTr: string;
  summaryTr: string;
  actorUserId: string | null;
  actorEmail: string | null;
  requestPath: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type MailIdentityAuditActionCode =
  (typeof MailIdentityAuditAction)[keyof typeof MailIdentityAuditAction];

@Injectable()
export class MailIdentityAuditService {
  public constructor(
    private readonly auditLogPersistenceService: AuditLogPersistenceService,
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepository: Repository<AuditLogEntity>,
    @InjectRepository(UserAccountEntity)
    private readonly userAccountRepository: Repository<UserAccountEntity>,
  ) {}

  public async record(params: {
    actorUserId: string | null;
    actorCompanyId: string | null;
    actionCode: MailIdentityAuditActionCode;
    metadata: Record<string, unknown>;
    requestPath?: string;
    httpMethod?: string;
    responseStatusCode?: number;
  }): Promise<void> {
    await this.auditLogPersistenceService.appendEntry(
      new AuditLogWriteRequest({
        actorUserId: params.actorUserId,
        actorCompanyId: params.actorCompanyId,
        httpMethod: params.httpMethod ?? "INTERNAL",
        requestPath: params.requestPath ?? "/mail-identity",
        responseStatusCode: params.responseStatusCode ?? 200,
        actionCode: params.actionCode,
        metadata: {
          ...params.metadata,
          kvkkPurposeTr:
            "Kurumsal e-posta gönderen kimliği yönetimi (sözleşme / meşru menfaat)",
        },
      }),
    );
  }

  public async recordFromUser(
    user: AuthenticatedUserContext,
    actionCode: MailIdentityAuditActionCode,
    metadata: Record<string, unknown>,
    requestPath?: string,
  ): Promise<void> {
    await this.record({
      actorUserId: user.userId,
      actorCompanyId: user.companyId,
      actionCode,
      metadata,
      requestPath,
      httpMethod: "USER_ACTION",
    });
  }

  public async listRecent(limit = 80): Promise<
    {
      id: string;
      actorUserId: string | null;
      actorCompanyId: string | null;
      actionCode: string;
      metadata: Record<string, unknown> | null;
      createdAt: string;
    }[]
  > {
    const rows = await this.auditLogRepository.find({
      where: { actionCode: Like("MAIL_IDENTITY_%") },
      order: { createdAt: "DESC" },
      take: limit,
    });
    return rows.map((row) => ({
      id: row.id,
      actorUserId: row.actorUserId,
      actorCompanyId: row.actorCompanyId,
      actionCode: row.actionCode,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  public async listForOrganization(
    organizationId: string,
    options: { limit?: number; before?: string } = {},
  ): Promise<{ logs: MailTenantAuditLogDto[]; nextBefore: string | null }> {
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
    const qb = this.auditLogRepository
      .createQueryBuilder("log")
      .where("log.actionCode LIKE :mailPrefix", { mailPrefix: "MAIL_%" })
      .andWhere(
        `(log.actorCompanyId = :orgId OR log.metadata->>'organizationId' = :orgId)`,
        { orgId: organizationId },
      )
      .orderBy("log.createdAt", "DESC")
      .take(limit + 1);
    if (options.before) {
      const beforeDate = new Date(options.before);
      if (!Number.isNaN(beforeDate.getTime())) {
        qb.andWhere("log.createdAt < :before", { before: beforeDate });
      }
    }
    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const actorIds = [
      ...new Set(
        page
          .map((row) => row.actorUserId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const actors =
      actorIds.length > 0
        ? await this.userAccountRepository.find({
            where: { id: In(actorIds) },
          })
        : [];
    const emailByUserId = new Map(
      actors.map((user) => [user.id, user.emailAddress]),
    );
    const logs: MailTenantAuditLogDto[] = page.map((row) => ({
      id: row.id,
      actionCode: row.actionCode,
      labelTr: mailAuditLabelTr(row.actionCode),
      summaryTr: mailAuditSummaryTr(row.actionCode, row.metadata),
      actorUserId: row.actorUserId,
      actorEmail: row.actorUserId
        ? emailByUserId.get(row.actorUserId) ?? null
        : null,
      requestPath: row.requestPath,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString(),
    }));
    const nextBefore =
      hasMore && page.length > 0
        ? page[page.length - 1].createdAt.toISOString()
        : null;
    return { logs, nextBefore };
  }
}
