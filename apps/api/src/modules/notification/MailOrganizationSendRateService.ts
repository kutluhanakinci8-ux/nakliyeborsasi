import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThan, Repository } from "typeorm";
import { MailMailboxSentEntity } from "../../infrastructure/database/entities/MailMailboxSentEntity";
import { EmailOutboxEntity } from "../../infrastructure/database/entities/EmailOutboxEntity";
import { MailSaasSubscriptionService } from "./MailSaasSubscriptionService";
import { CompanySubscriptionPersistenceService } from "../subscription/CompanySubscriptionPersistenceService";

export type OrgRateSnapshot = {
  organizationId: string;
  sendsLastHour: number;
  limitPerHour: number;
  remaining: number;
  utilizationPercent: number;
  nearLimit: boolean;
  atLimit: boolean;
  window: "hour";
  windowLabelTr: string;
};

@Injectable()
export class MailOrganizationSendRateService {
  private readonly logger = new Logger(MailOrganizationSendRateService.name);
  private readonly sendTimestamps = new Map<string, number[]>();
  private static readonly windowMs = 60 * 60 * 1000;

  public constructor(
    private readonly configService: ConfigService,
    private readonly mailSaasSubscriptionService: MailSaasSubscriptionService,
    private readonly companySubscriptionPersistenceService: CompanySubscriptionPersistenceService,
    @InjectRepository(MailMailboxSentEntity)
    private readonly mailboxSentRepository: Repository<MailMailboxSentEntity>,
    @InjectRepository(EmailOutboxEntity)
    private readonly outboxRepository: Repository<EmailOutboxEntity>,
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
    const count = await this.countSendsInWindow(organizationId);
    const limit = await this.resolveLimitPerHour(organizationId);
    if (count >= limit) {
      throw new Error(
        `Kurumsal gönderim limiti aşıldı (${limit}/saat, org=${organizationId}).`,
      );
    }
  }

  public recordSend(organizationId: string): void {
    const now = Date.now();
    const existing = this.sendTimestamps.get(organizationId) ?? [];
    const pruned = existing.filter(
      (ts) => now - ts < MailOrganizationSendRateService.windowMs,
    );
    pruned.push(now);
    this.sendTimestamps.set(organizationId, pruned);
  }

  public async getSnapshot(organizationId: string): Promise<OrgRateSnapshot> {
    const sendsLastHour = await this.countSendsInWindow(organizationId);
    const limitPerHour = await this.resolveLimitPerHour(organizationId);
    const remaining = Math.max(0, limitPerHour - sendsLastHour);
    const utilizationPercent =
      limitPerHour > 0
        ? Math.min(100, Math.round((sendsLastHour / limitPerHour) * 100))
        : 0;
    return {
      organizationId,
      sendsLastHour,
      limitPerHour,
      remaining,
      utilizationPercent,
      nearLimit: utilizationPercent >= 80 && !this.isAtLimit(sendsLastHour, limitPerHour),
      atLimit: this.isAtLimit(sendsLastHour, limitPerHour),
      window: "hour",
      windowLabelTr: "Son 60 dakika",
    };
  }

  private isAtLimit(used: number, limit: number): boolean {
    return limit > 0 && used >= limit;
  }

  private async countSendsInWindow(organizationId: string): Promise<number> {
    const memory = this.countSendsInMemory(organizationId);
    const persisted = await this.countSendsFromDatabase(organizationId);
    return Math.max(memory, persisted);
  }

  private countSendsInMemory(organizationId: string): number {
    const now = Date.now();
    const existing = this.sendTimestamps.get(organizationId) ?? [];
    const pruned = existing.filter(
      (ts) => now - ts < MailOrganizationSendRateService.windowMs,
    );
    this.sendTimestamps.set(organizationId, pruned);
    return pruned.length;
  }

  private async countSendsFromDatabase(organizationId: string): Promise<number> {
    const since = new Date(Date.now() - MailOrganizationSendRateService.windowMs);
    try {
      const mailboxSends = await this.mailboxSentRepository.count({
        where: {
          organizationId,
          sentAt: MoreThan(since),
        },
      });
      const outboxSends = await this.outboxRepository
        .createQueryBuilder("outbox")
        .where("outbox.status = :status", { status: "sent" })
        .andWhere("outbox.sentAt > :since", { since })
        .andWhere("outbox.metadata ->> 'companyId' = :organizationId", {
          organizationId,
        })
        .getCount();
      return mailboxSends + outboxSends;
    } catch (error) {
      this.logger.warn(
        `Send rate DB count failed for org=${organizationId}: ${String(error)}`,
      );
      return 0;
    }
  }
}
