import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CompanyRoleCode } from "@nakliyeborsasi/core";
import { CompanySocialSettingsEntity } from "../../infrastructure/database/entities/CompanySocialSettingsEntity";
import { CompanyMembershipEntity } from "../../infrastructure/database/entities/CompanyMembershipEntity";
import { SocialHubConnectionHealthService } from "./SocialHubConnectionHealthService";
import { SocialHubOutboundDeliveryLogService } from "./SocialHubOutboundDeliveryLogService";
import { OperationalNotificationService } from "../notification/OperationalNotificationService";
import { labelSocialPlatform } from "./socialHubPlatformLabels";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class SocialHubWeeklyEmailService {
  private readonly logger = new Logger(SocialHubWeeklyEmailService.name);

  public constructor(
    @InjectRepository(CompanySocialSettingsEntity)
    private readonly settingsRepository: Repository<CompanySocialSettingsEntity>,
    @InjectRepository(CompanyMembershipEntity)
    private readonly membershipRepository: Repository<CompanyMembershipEntity>,
    private readonly connectionHealthService: SocialHubConnectionHealthService,
    private readonly deliveryLogService: SocialHubOutboundDeliveryLogService,
    private readonly operationalNotificationService: OperationalNotificationService,
  ) {}

  public async runSweep(): Promise<number> {
    const candidates = await this.settingsRepository
      .createQueryBuilder("settings")
      .where("settings.socialHubWeeklyEmailEnabled = :enabled", {
        enabled: true,
      })
      .orderBy("settings.socialHubWeeklyEmailLastSentAt", "ASC", "NULLS FIRST")
      .take(50)
      .getMany();
    let sent = 0;
    const now = Date.now();
    for (const settings of candidates) {
      const last = settings.socialHubWeeklyEmailLastSentAt?.getTime() ?? 0;
      if (now - last < WEEK_MS) {
        continue;
      }
      if (await this.sendWeeklyForCompany(settings.companyId)) {
        sent += 1;
      }
    }
    return sent;
  }

  public async sendWeeklyForCompany(companyId: string): Promise<boolean> {
    const settings = await this.settingsRepository.findOne({
      where: { companyId },
    });
    if (!settings?.socialHubWeeklyEmailEnabled) {
      return false;
    }
    const owners = await this.membershipRepository.find({
      where: { companyId, roleCode: CompanyRoleCode.CompanyOwner },
    });
    if (owners.length === 0) {
      return false;
    }
    try {
      const since7d = new Date(Date.now() - WEEK_MS);
      const health = await this.connectionHealthService.buildHealthDashboard(
        companyId,
      );
      const platformStats =
        await this.deliveryLogService.summarizeRecentByPlatform(
          companyId,
          since7d,
        );
      const channelLines = [...platformStats.entries()].map(([code, stats]) => {
        const total = stats.ok + stats.failed;
        const rate =
          total > 0 ? Math.round((stats.ok / total) * 100) : 100;
        return `${labelSocialPlatform(code)}: ${stats.ok}/${total} başarılı (%${rate})`;
      });
      const summaryParts = [
        `Genel durum: ${health.overallStatus}`,
        channelLines.length > 0
          ? `7g kanal gönderimi — ${channelLines.join(" | ")}`
          : "7g içinde kayıtlı kanal gönderimi yok.",
      ];
      const webBase =
        process.env.WEB_PUBLIC_BASE_URL?.trim() ?? "https://app.lerta.com.tr";
      const hubUrl = `${webBase.replace(/\/$/, "")}/hesap/sosyal-medya`;
      await this.operationalNotificationService.afterSocialHubWeeklyDigest({
        companyId,
        ownerUserIds: owners.map((row) => row.userId),
        summary: summaryParts.join(" "),
        hubUrl,
      });
      settings.socialHubWeeklyEmailLastSentAt = new Date();
      await this.settingsRepository.save(settings);
      return true;
    } catch (error) {
      this.logger.warn(
        `Weekly email failed company=${companyId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }
}
