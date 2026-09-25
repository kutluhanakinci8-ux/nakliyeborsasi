import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EmailOutboxService } from "./EmailOutboxService";
import { PlatformMailTenantAdminService } from "./PlatformMailTenantAdminService";
import { MailDomainEntity } from "../../infrastructure/database/entities/MailDomainEntity";
import { MailOrganizationBillingStateEntity } from "../../infrastructure/database/entities/MailOrganizationBillingStateEntity";
import { MailMailboxSentEntity } from "../../infrastructure/database/entities/MailMailboxSentEntity";
import { EmailOrganizationSuppressionEntity } from "../../infrastructure/database/entities/EmailOrganizationSuppressionEntity";

export type MailPlatformKpiSnapshot = {
  collectedAt: string;
  tenants: {
    total: number;
    suspended: number;
    withVerifiedCustomDomain: number;
    onPaidMailPlan: number;
    activeOutboundLast7Days: number;
  };
  domains: {
    customTotal: number;
    customVerified: number;
    verificationRatePercent: number;
  };
  outbox: {
    pending: number;
    failed: number;
    sentLast24h: number;
  };
  billing: {
    grace: number;
    pastDue: number;
    trialing: number;
    active: number;
  };
  suppressions: {
    bounceTotal: number;
    addedLast7Days: number;
  };
  summaryTr: string;
};

const PAID_MAIL_PLANS = new Set([
  "lerta_mail_corporate_tr",
  "lerta_mail_enterprise_tr",
]);

@Injectable()
export class MailPlatformKpiService {
  public constructor(
    private readonly platformMailTenantAdminService: PlatformMailTenantAdminService,
    private readonly emailOutboxService: EmailOutboxService,
    @InjectRepository(MailDomainEntity)
    private readonly domainRepository: Repository<MailDomainEntity>,
    @InjectRepository(MailOrganizationBillingStateEntity)
    private readonly billingStateRepository: Repository<MailOrganizationBillingStateEntity>,
    @InjectRepository(MailMailboxSentEntity)
    private readonly sentRepository: Repository<MailMailboxSentEntity>,
    @InjectRepository(EmailOrganizationSuppressionEntity)
    private readonly orgSuppressionRepository: Repository<EmailOrganizationSuppressionEntity>,
  ) {}

  public async buildSnapshot(): Promise<MailPlatformKpiSnapshot> {
    const tenants = await this.platformMailTenantAdminService.listTenants();
    const outbox = await this.emailOutboxService.getOutboxStats();
    const customDomains = await this.domainRepository.find({
      where: { domainType: "custom" },
    });
    const customVerified = customDomains.filter(
      (row) => row.verificationStatus === "verified",
    ).length;
    const customTotal = customDomains.length;
    const verificationRatePercent =
      customTotal === 0
        ? 0
        : Math.round((customVerified / customTotal) * 100);

    const billingRows = await this.billingStateRepository.find();
    const billing = {
      grace: billingRows.filter((r) => r.lifecycleStatus === "grace").length,
      pastDue: billingRows.filter((r) => r.lifecycleStatus === "past_due")
        .length,
      trialing: billingRows.filter((r) => r.lifecycleStatus === "trialing")
        .length,
      active: billingRows.filter((r) => r.lifecycleStatus === "active").length,
    };

    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeOutboundRows: Array<{ count: string }> =
      await this.sentRepository.query(
        `
        SELECT COUNT(DISTINCT "organizationId")::text AS count
        FROM mail_mailbox_sent
        WHERE "sentAt" >= $1
        `,
        [since7d],
      );
    const activeOutboundLast7Days = Number.parseInt(
      activeOutboundRows[0]?.count ?? "0",
      10,
    );

    const suppressions = await this.orgSuppressionRepository.find();
    const bounceTotal = suppressions.filter((row) =>
      row.reason.toLowerCase().startsWith("bounce:"),
    ).length;
    const addedLast7Days = suppressions.filter(
      (row) => row.createdAt >= since7d,
    ).length;

    const tenantKpi = {
      total: tenants.length,
      suspended: tenants.filter((t) => t.suspended).length,
      withVerifiedCustomDomain: tenants.filter((t) => t.domainVerified).length,
      onPaidMailPlan: tenants.filter((t) =>
        t.planCode ? PAID_MAIL_PLANS.has(t.planCode) : false,
      ).length,
      activeOutboundLast7Days,
    };

    const summaryTr =
      `${tenantKpi.total} tenant · ${tenantKpi.withVerifiedCustomDomain} doğrulanmış domain · ` +
      `${outbox.last24hSent} gönderim (24s) · outbox bekleyen ${outbox.pending}`;

    return {
      collectedAt: new Date().toISOString(),
      tenants: tenantKpi,
      domains: {
        customTotal,
        customVerified,
        verificationRatePercent,
      },
      outbox: {
        pending: outbox.pending,
        failed: outbox.failed,
        sentLast24h: outbox.last24hSent,
      },
      billing,
      suppressions: {
        bounceTotal,
        addedLast7Days,
      },
      summaryTr,
    };
  }
}
