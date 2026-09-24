import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Like, Repository } from "typeorm";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { AuditLogEntity } from "../../infrastructure/database/entities/AuditLogEntity";
import { AuditLogPersistenceService } from "../../infrastructure/audit/AuditLogPersistenceService";
import { AuditLogWriteRequest } from "../../infrastructure/audit/AuditLogWriteRequest";

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
} as const;

export type MailIdentityAuditActionCode =
  (typeof MailIdentityAuditAction)[keyof typeof MailIdentityAuditAction];

@Injectable()
export class MailIdentityAuditService {
  public constructor(
    private readonly auditLogPersistenceService: AuditLogPersistenceService,
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepository: Repository<AuditLogEntity>,
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
}
