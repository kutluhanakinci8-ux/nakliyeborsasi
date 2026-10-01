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
import { parseRoadmapInterestPlatformCodes } from "./socialHubRoadmapInterest";
import {
  buildRoadmapBetaOpsEmailClause,
  buildRoadmapInterestEmailClause,
  buildWebhookBridgeEmailClause,
} from "./socialHubRoadmapDigest";
import { SocialHubAuditService } from "./SocialHubAuditService";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

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
    private readonly auditService: SocialHubAuditService,
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
      const result = await this.sendWeeklyForCompany(settings.companyId, {
        requireEnabled: true,
      });
      if (result.sent) {
        sent += 1;
      }
    }
    return sent;
  }

  public async sendWeeklyForCompany(
    companyId: string,
    options: { requireEnabled?: boolean },
  ): Promise<{ sent: boolean; message: string }> {
    const settings = await this.settingsRepository.findOne({
      where: { companyId },
    });
    if (!settings) {
      return { sent: false, message: "Sosyal hub ayarları bulunamadı." };
    }
    if (options.requireEnabled && !settings.socialHubWeeklyEmailEnabled) {
      return { sent: false, message: "Haftalık e-posta özet kapalı." };
    }
    const owners = await this.membershipRepository.find({
      where: { companyId, roleCode: CompanyRoleCode.CompanyOwner },
    });
    if (owners.length === 0) {
      return {
        sent: false,
        message: "Firma sahibi bulunamadı — özet gönderilemedi.",
      };
    }
    try {
      const since7d = new Date(Date.now() - WEEK_MS);
      const since30d = new Date(Date.now() - MONTH_MS);
      const health = await this.connectionHealthService.buildHealthDashboard(
        companyId,
      );
      const [platformStats7d, platformStats30d] = await Promise.all([
        this.deliveryLogService.summarizeRecentByPlatform(companyId, since7d),
        this.deliveryLogService.summarizeRecentByPlatform(companyId, since30d),
      ]);
      const channelLines7d = [...platformStats7d.entries()].map(([code, stats]) => {
        const total = stats.ok + stats.failed;
        const rate = total > 0 ? Math.round((stats.ok / total) * 100) : 100;
        return `${labelSocialPlatform(code)}: ${stats.ok}/${total} başarılı (%${rate})`;
      });
      const channelLines30d = [...platformStats30d.entries()].map(
        ([code, stats]) => {
          const total = stats.ok + stats.failed;
          const rate = total > 0 ? Math.round((stats.ok / total) * 100) : 100;
          return `${labelSocialPlatform(code)}: ${stats.ok}/${total} (%${rate})`;
        },
      );
      const roadmapClause = buildRoadmapInterestEmailClause(
        parseRoadmapInterestPlatformCodes(settings.roadmapInterestPlatformCodesJson),
      );
      const summaryParts = [
        `Genel durum: ${health.overallStatus}`,
        channelLines7d.length > 0
          ? `7g kanal gönderimi — ${channelLines7d.join(" | ")}`
          : "7g içinde kayıtlı kanal gönderimi yok.",
        channelLines30d.length > 0
          ? `30g kanal gönderimi — ${channelLines30d.join(" | ")}`
          : "30g içinde kayıtlı kanal gönderimi yok.",
      ];
      if (roadmapClause) {
        summaryParts.push(roadmapClause);
      }
      const betaClause = buildRoadmapBetaOpsEmailClause(
        health.roadmapChannels ?? [],
      );
      if (betaClause) {
        summaryParts.push(betaClause);
      }
      const bridgedByPlatform =
        await this.auditService.summarizeWebhookBridgedByPlatform(
          since7d,
          companyId,
        );
      const inboundBridged7d = bridgedByPlatform.reduce(
        (sum, row) => sum + row.count,
        0,
      );
      const webhookClause = buildWebhookBridgeEmailClause(
        inboundBridged7d,
        bridgedByPlatform.map((row) => ({
          label: labelSocialPlatform(row.platformCode),
          count: row.count,
        })),
      );
      if (webhookClause) {
        summaryParts.push(webhookClause);
      }
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
      return { sent: true, message: "Haftalık özet e-postası gönderildi." };
    } catch (error) {
      this.logger.warn(
        `Weekly email failed company=${companyId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return {
        sent: false,
        message: "Haftalık özet gönderilemedi. E-posta yapılandırmasını kontrol edin.",
      };
    }
  }
}
