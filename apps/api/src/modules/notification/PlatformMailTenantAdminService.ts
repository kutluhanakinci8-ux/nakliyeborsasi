import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { CompanyEntity } from "../../infrastructure/database/entities/CompanyEntity";
import { CompanySubscriptionEntity } from "../../infrastructure/database/entities/CompanySubscriptionEntity";
import { MailDomainEntity } from "../../infrastructure/database/entities/MailDomainEntity";
import { MailMailboxEntity } from "../../infrastructure/database/entities/MailMailboxEntity";
import { MailOrganizationBillingStateEntity } from "../../infrastructure/database/entities/MailOrganizationBillingStateEntity";
import { MailOrganizationOperatorStateEntity } from "../../infrastructure/database/entities/MailOrganizationOperatorStateEntity";
import { MailSenderIdentityEntity } from "../../infrastructure/database/entities/MailSenderIdentityEntity";
import {
  MailIdentityAuditAction,
  MailIdentityAuditService,
} from "./MailIdentityAuditService";

export type MailTenantAdminRow = {
  organizationId: string;
  companyLegalName: string;
  planCode: string | null;
  billingStatus: string | null;
  mailboxCount: number;
  senderCount: number;
  customDomain: string | null;
  domainVerified: boolean;
  suspended: boolean;
  abuseFlag: boolean;
  suspendReason: string | null;
  operatorNote: string | null;
  suspendedAt: string | null;
};

@Injectable()
export class PlatformMailTenantAdminService {
  public constructor(
    @InjectRepository(MailSenderIdentityEntity)
    private readonly senderRepository: Repository<MailSenderIdentityEntity>,
    @InjectRepository(MailMailboxEntity)
    private readonly mailboxRepository: Repository<MailMailboxEntity>,
    @InjectRepository(MailDomainEntity)
    private readonly domainRepository: Repository<MailDomainEntity>,
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,
    @InjectRepository(CompanySubscriptionEntity)
    private readonly subscriptionRepository: Repository<CompanySubscriptionEntity>,
    @InjectRepository(MailOrganizationBillingStateEntity)
    private readonly billingStateRepository: Repository<MailOrganizationBillingStateEntity>,
    @InjectRepository(MailOrganizationOperatorStateEntity)
    private readonly operatorStateRepository: Repository<MailOrganizationOperatorStateEntity>,
    private readonly mailIdentityAuditService: MailIdentityAuditService,
  ) {}

  public async listTenants(): Promise<MailTenantAdminRow[]> {
    const senderRows = await this.senderRepository
      .createQueryBuilder("sender")
      .select("sender.organizationId", "organizationId")
      .addSelect("COUNT(*)", "senderCount")
      .groupBy("sender.organizationId")
      .getRawMany<{ organizationId: string; senderCount: string }>();
    const mailboxRows = await this.mailboxRepository
      .createQueryBuilder("mailbox")
      .select("mailbox.organizationId", "organizationId")
      .addSelect("COUNT(*)", "mailboxCount")
      .groupBy("mailbox.organizationId")
      .getRawMany<{ organizationId: string; mailboxCount: string }>();

    const orgIds = new Set<string>();
    for (const row of senderRows) {
      orgIds.add(row.organizationId);
    }
    for (const row of mailboxRows) {
      orgIds.add(row.organizationId);
    }
    const domainOrgRows = await this.domainRepository
      .createQueryBuilder("domain")
      .select("domain.organizationId", "organizationId")
      .where("domain.organizationId IS NOT NULL")
      .distinct(true)
      .getRawMany<{ organizationId: string }>();
    for (const row of domainOrgRows) {
      orgIds.add(row.organizationId);
    }

    const ids = [...orgIds];
    if (ids.length === 0) {
      return [];
    }

    const companies = await this.companyRepository.find({
      where: { id: In(ids) },
    });
    const subscriptions = await this.subscriptionRepository.find({
      where: { companyId: In(ids), isActive: true },
    });
    const billingStates = await this.billingStateRepository.find({
      where: { organizationId: In(ids) },
    });
    const operatorStates = await this.operatorStateRepository.find({
      where: { organizationId: In(ids) },
    });
    const domains = await this.domainRepository.find({
      where: { organizationId: In(ids), domainType: "custom" },
    });

    const senderMap = new Map(
      senderRows.map((row) => [row.organizationId, Number(row.senderCount)]),
    );
    const mailboxMap = new Map(
      mailboxRows.map((row) => [row.organizationId, Number(row.mailboxCount)]),
    );

    return ids
      .map((organizationId) => {
        const company = companies.find((c) => c.id === organizationId);
        const subscription = subscriptions.find(
          (s) => s.companyId === organizationId,
        );
        const billing = billingStates.find(
          (b) => b.organizationId === organizationId,
        );
        const operator = operatorStates.find(
          (o) => o.organizationId === organizationId,
        );
        const customDomain = domains.find(
          (d) => d.organizationId === organizationId,
        );
        return {
          organizationId,
          companyLegalName: company?.legalName ?? organizationId.slice(0, 8),
          planCode: subscription?.planCode ?? null,
          billingStatus: billing?.lifecycleStatus ?? null,
          mailboxCount: mailboxMap.get(organizationId) ?? 0,
          senderCount: senderMap.get(organizationId) ?? 0,
          customDomain: customDomain?.domain ?? null,
          domainVerified: customDomain?.verificationStatus === "verified",
          suspended: operator?.suspended ?? false,
          abuseFlag: operator?.abuseFlag ?? false,
          suspendReason: operator?.suspendReason ?? null,
          operatorNote: operator?.operatorNote ?? null,
          suspendedAt: operator?.suspendedAt?.toISOString() ?? null,
        };
      })
      .sort((a, b) => a.companyLegalName.localeCompare(b.companyLegalName, "tr"));
  }

  public async suspendTenant(
    actor: AuthenticatedUserContext,
    organizationId: string,
    params: { reason?: string; abuseFlag?: boolean },
  ): Promise<MailTenantAdminRow> {
    await this.assertTenantExists(organizationId);
    const row = await this.findOrCreateOperatorState(organizationId);
    row.suspended = true;
    row.suspendReason = params.reason?.trim() || "Operatör askıya aldı";
    row.abuseFlag = params.abuseFlag ?? true;
    row.suspendedAt = new Date();
    row.updatedByUserId = actor.userId;
    await this.operatorStateRepository.save(row);
    await this.mailIdentityAuditService.recordFromUser(
      actor,
      MailIdentityAuditAction.TenantSuspended,
      {
        organizationId,
        reason: row.suspendReason,
        abuseFlag: row.abuseFlag,
      },
      `/platform-admin/mail/tenants/${organizationId}/suspend`,
    );
    const list = await this.listTenants();
    const found = list.find((t) => t.organizationId === organizationId);
    if (!found) {
      throw new NotFoundException("Tenant bulunamadı");
    }
    return found;
  }

  public async unsuspendTenant(
    actor: AuthenticatedUserContext,
    organizationId: string,
  ): Promise<MailTenantAdminRow> {
    const row = await this.operatorStateRepository.findOne({
      where: { organizationId },
    });
    if (!row) {
      throw new NotFoundException("Operatör kaydı yok");
    }
    row.suspended = false;
    row.suspendReason = null;
    row.suspendedAt = null;
    row.updatedByUserId = actor.userId;
    await this.operatorStateRepository.save(row);
    await this.mailIdentityAuditService.recordFromUser(
      actor,
      MailIdentityAuditAction.TenantUnsuspended,
      { organizationId },
      `/platform-admin/mail/tenants/${organizationId}/unsuspend`,
    );
    const list = await this.listTenants();
    const found = list.find((t) => t.organizationId === organizationId);
    if (!found) {
      throw new NotFoundException("Tenant bulunamadı");
    }
    return found;
  }

  public async updateTenantNote(
    actor: AuthenticatedUserContext,
    organizationId: string,
    note: string,
  ): Promise<MailTenantAdminRow> {
    await this.assertTenantExists(organizationId);
    const row = await this.findOrCreateOperatorState(organizationId);
    row.operatorNote = note.trim() || null;
    row.updatedByUserId = actor.userId;
    await this.operatorStateRepository.save(row);
    const list = await this.listTenants();
    const found = list.find((t) => t.organizationId === organizationId);
    if (!found) {
      throw new NotFoundException("Tenant bulunamadı");
    }
    return found;
  }

  private async assertTenantExists(organizationId: string): Promise<void> {
    const company = await this.companyRepository.findOne({
      where: { id: organizationId },
    });
    if (!company) {
      throw new NotFoundException("Firma bulunamadı");
    }
  }

  private async findOrCreateOperatorState(
    organizationId: string,
  ): Promise<MailOrganizationOperatorStateEntity> {
    const existing = await this.operatorStateRepository.findOne({
      where: { organizationId },
    });
    if (existing) {
      return existing;
    }
    return this.operatorStateRepository.save(
      this.operatorStateRepository.create({
        organizationId,
        suspended: false,
        suspendReason: null,
        abuseFlag: false,
        operatorNote: null,
        suspendedAt: null,
        updatedByUserId: null,
      }),
    );
  }
}
