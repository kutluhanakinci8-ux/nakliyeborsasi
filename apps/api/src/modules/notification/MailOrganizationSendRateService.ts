import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MailSaasSubscriptionService } from "./MailSaasSubscriptionService";
import { CompanySubscriptionPersistenceService } from "../subscription/CompanySubscriptionPersistenceService";

type OrgRateSnapshot = {
  organizationId: string;
  sendsLastHour: number;
  limitPerHour: number;
};

@Injectable()
export class MailOrganizationSendRateService {
  private readonly logger = new Logger(MailOrganizationSendRateService.name);
  private readonly sendTimestamps = new Map<string, number[]>();

  public constructor(
    private readonly configService: ConfigService,
    private readonly mailSaasSubscriptionService: MailSaasSubscriptionService,
    private readonly companySubscriptionPersistenceService: CompanySubscriptionPersistenceService,
  ) {}

  public async resolveLimitPerHour(organizationId: string): Promise<number> {
    const raw = this.configService.get<string>("MAIL_ORG_MAX_SENDS_PER_HOUR");
    const envOverride = raw ? Number.parseInt(raw, 10) : null;
    if (envOverride && Number.isFinite(envOverride) && envOverride > 0) {
      return envOverride;
    }
    const snapshot =
      await this.companySubscriptionPersistenceService.getSnapshot(
        organizationId,
      );
    return this.mailSaasSubscriptionService.resolveSendLimitForPlanCode(
      snapshot?.activePlan.planCode ?? null,
    );
  }

  public async assertCanSend(organizationId: string): Promise<void> {
    const count = this.countSendsInWindow(organizationId);
    const limit = await this.resolveLimitPerHour(organizationId);
    if (count >= limit) {
      throw new Error(
        `Kurumsal gönderim limiti aşıldı (${limit}/saat, org=${organizationId}).`,
      );
    }
  }

  public recordSend(organizationId: string): void {
    const now = Date.now();
    const windowMs = 60 * 60 * 1000;
    const existing = this.sendTimestamps.get(organizationId) ?? [];
    const pruned = existing.filter((ts) => now - ts < windowMs);
    pruned.push(now);
    this.sendTimestamps.set(organizationId, pruned);
  }

  public async getSnapshot(organizationId: string): Promise<OrgRateSnapshot> {
    return {
      organizationId,
      sendsLastHour: this.countSendsInWindow(organizationId),
      limitPerHour: await this.resolveLimitPerHour(organizationId),
    };
  }

  private countSendsInWindow(organizationId: string): number {
    const now = Date.now();
    const windowMs = 60 * 60 * 1000;
    const existing = this.sendTimestamps.get(organizationId) ?? [];
    const pruned = existing.filter((ts) => now - ts < windowMs);
    this.sendTimestamps.set(organizationId, pruned);
    return pruned.length;
  }
}
