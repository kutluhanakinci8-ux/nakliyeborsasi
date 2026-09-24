import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type OrgRateSnapshot = {
  organizationId: string;
  sendsLastHour: number;
  limitPerHour: number;
};

@Injectable()
export class MailOrganizationSendRateService {
  private readonly logger = new Logger(MailOrganizationSendRateService.name);
  private readonly sendTimestamps = new Map<string, number[]>();

  public constructor(private readonly configService: ConfigService) {}

  public resolveLimitPerHour(): number {
    const raw = this.configService.get<string>("MAIL_ORG_MAX_SENDS_PER_HOUR");
    const parsed = raw ? Number.parseInt(raw, 10) : 200;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 200;
  }

  public assertCanSend(organizationId: string): void {
    const count = this.countSendsInWindow(organizationId);
    const limit = this.resolveLimitPerHour();
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

  public getSnapshot(organizationId: string): OrgRateSnapshot {
    return {
      organizationId,
      sendsLastHour: this.countSendsInWindow(organizationId),
      limitPerHour: this.resolveLimitPerHour(),
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
