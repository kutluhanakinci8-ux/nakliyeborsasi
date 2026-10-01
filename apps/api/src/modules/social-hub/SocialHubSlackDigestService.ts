import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { SocialConnectionStatusCode, SocialPlatformCode } from "@nakliyeborsasi/core";
import { CompanySocialSettingsEntity } from "../../infrastructure/database/entities/CompanySocialSettingsEntity";
import { CompanySocialThreadLinkEntity } from "../../infrastructure/database/entities/CompanySocialThreadLinkEntity";
import { SocialHubConnectionHealthService } from "./SocialHubConnectionHealthService";
import { SocialHubOutboundDeliveryLogService } from "./SocialHubOutboundDeliveryLogService";
import { SocialHubSlackNotificationService } from "./SocialHubSlackNotificationService";
import { isDigestWithinBusinessHours } from "./socialHubDigestBusinessHours";
import { labelSocialPlatform } from "./socialHubPlatformLabels";
import { parseRoadmapInterestPlatformCodes } from "./socialHubRoadmapInterest";
import { buildRoadmapInterestDigestSection } from "./socialHubRoadmapDigest";

const DIGEST_INTERVAL_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

const PLATFORM_LABELS: Record<SocialPlatformCode, string> = {
  [SocialPlatformCode.Instagram]: "Instagram",
  [SocialPlatformCode.FacebookMessenger]: "Facebook Messenger",
  [SocialPlatformCode.WhatsAppCloud]: "WhatsApp",
  [SocialPlatformCode.LinkedIn]: "LinkedIn",
};

@Injectable()
export class SocialHubSlackDigestService {
  private readonly logger = new Logger(SocialHubSlackDigestService.name);

  public constructor(
    @InjectRepository(CompanySocialSettingsEntity)
    private readonly settingsRepository: Repository<CompanySocialSettingsEntity>,
    @InjectRepository(CompanySocialThreadLinkEntity)
    private readonly threadLinkRepository: Repository<CompanySocialThreadLinkEntity>,
    private readonly connectionHealthService: SocialHubConnectionHealthService,
    private readonly deliveryLogService: SocialHubOutboundDeliveryLogService,
    private readonly slackNotificationService: SocialHubSlackNotificationService,
  ) {}

  public async runSweep(): Promise<number> {
    const candidates = await this.settingsRepository
      .createQueryBuilder("settings")
      .where("settings.socialSlackDailyDigestEnabled = :enabled", {
        enabled: true,
      })
      .orderBy("settings.socialSlackDailyDigestLastSentAt", "ASC", "NULLS FIRST")
      .take(60)
      .getMany();
    let sent = 0;
    const now = Date.now();
    for (const settings of candidates) {
      const last = settings.socialSlackDailyDigestLastSentAt?.getTime() ?? 0;
      if (now - last < DIGEST_INTERVAL_MS) {
        continue;
      }
      const result = await this.sendDigestForCompany(settings.companyId, {
        requireDigestEnabled: true,
        enforceDailyInterval: true,
        respectBusinessHours: true,
      });
      if (result.sent) {
        sent += 1;
      }
    }
    return sent;
  }

  public async sendDigestForCompany(
    companyId: string,
    options: {
      requireDigestEnabled?: boolean;
      enforceDailyInterval?: boolean;
      respectBusinessHours?: boolean;
    },
  ): Promise<{ sent: boolean; message: string }> {
    const settings = await this.settingsRepository.findOne({
      where: { companyId },
    });
    if (!settings) {
      return { sent: false, message: "Sosyal hub ayarları bulunamadı." };
    }
    if (options.requireDigestEnabled && !settings.socialSlackDailyDigestEnabled) {
      return { sent: false, message: "Günlük özet kapalı." };
    }
    if (options.enforceDailyInterval) {
      const last = settings.socialSlackDailyDigestLastSentAt?.getTime() ?? 0;
      if (Date.now() - last < DIGEST_INTERVAL_MS) {
        return {
          sent: false,
          message: "Son özet 24 saatten yeni; bekleyin veya manuel gönderin.",
        };
      }
    }
    if (
      options.respectBusinessHours &&
      !isDigestWithinBusinessHours(settings)
    ) {
      return { sent: false, message: "İş saatleri dışında — otomatik özet atlandı." };
    }
    try {
      const health = await this.connectionHealthService.buildHealthDashboard(
        companyId,
      );
      const statsSection = await this.buildDeliveryStatsSection(companyId);
      const ratesSection = await this.buildChannelRatesSection(companyId);
      const rates7dSection = await this.buildChannelRates7dSection(companyId);
      const rates30dSection = await this.buildChannelRates30dSection(companyId);
      const channelSummary = this.buildChannelSummary(health);
      const failureSection = await this.buildRecentFailureSection(companyId);
      const summaryParts = [statsSection];
      if (ratesSection) {
        summaryParts.push(ratesSection);
      }
      if (rates7dSection) {
        summaryParts.push(rates7dSection);
      }
      if (rates30dSection) {
        summaryParts.push(rates30dSection);
      }
      summaryParts.push(channelSummary);
      const roadmapSection = buildRoadmapInterestDigestSection(
        parseRoadmapInterestPlatformCodes(settings.roadmapInterestPlatformCodesJson),
      );
      if (roadmapSection) {
        summaryParts.push(roadmapSection);
      }
      if (failureSection) {
        summaryParts.push(failureSection);
      }
      const summary = summaryParts.join("\n\n");
      const posted = await this.slackNotificationService.postDailyDigest({
        companyId,
        overallStatus: health.overallStatus,
        summary,
      });
      if (!posted) {
        return {
          sent: false,
          message:
            "Slack webhook tanımlı değil. Webhook girin veya Mesajlar köprüsünü kullanın.",
        };
      }
      settings.socialSlackDailyDigestLastSentAt = new Date();
      await this.settingsRepository.save(settings);
      return { sent: true, message: "Slack özet mesajı gönderildi." };
    } catch (error) {
      this.logger.warn(
        `Digest send failed company=${companyId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return {
        sent: false,
        message: "Özet gönderilemedi. Webhook ve kanal erişimini kontrol edin.",
      };
    }
  }

  private async buildChannelRatesSection(companyId: string): Promise<string> {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const platformMap =
      await this.deliveryLogService.summarizeRecentByPlatform(
        companyId,
        since24h,
      );
    if (platformMap.size === 0) {
      return "";
    }
    const lines = [...platformMap.entries()].map(([code, stats]) => {
      const total = stats.ok + stats.failed;
      const rate = total > 0 ? Math.round((stats.ok / total) * 100) : 100;
      return `• ${labelSocialPlatform(code)}: %${rate} (${stats.ok}/${total})`;
    });
    return `*Kanal başarı oranı (24s)*\n${lines.join("\n")}`;
  }

  private async buildChannelRates7dSection(companyId: string): Promise<string> {
    const since7d = new Date(Date.now() - WEEK_MS);
    const platformMap =
      await this.deliveryLogService.summarizeRecentByPlatform(
        companyId,
        since7d,
      );
    if (platformMap.size === 0) {
      return "";
    }
    const lines = [...platformMap.entries()].map(([code, stats]) => {
      const total = stats.ok + stats.failed;
      const rate = total > 0 ? Math.round((stats.ok / total) * 100) : 100;
      return `• ${labelSocialPlatform(code)}: %${rate} (${stats.ok}/${total})`;
    });
    return `*Kanal başarı oranı (7g)*\n${lines.join("\n")}`;
  }

  private async buildChannelRates30dSection(companyId: string): Promise<string> {
    const since30d = new Date(Date.now() - MONTH_MS);
    const platformMap =
      await this.deliveryLogService.summarizeRecentByPlatform(
        companyId,
        since30d,
      );
    if (platformMap.size === 0) {
      return "";
    }
    const lines = [...platformMap.entries()].map(([code, stats]) => {
      const total = stats.ok + stats.failed;
      const rate = total > 0 ? Math.round((stats.ok / total) * 100) : 100;
      return `• ${labelSocialPlatform(code)}: %${rate} (${stats.ok}/${total})`;
    });
    return `*Kanal başarı oranı (30g)*\n${lines.join("\n")}`;
  }

  private async buildDeliveryStatsSection(companyId: string): Promise<string> {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [okCount, failedCount] = await Promise.all([
      this.deliveryLogService.countRecentByStatus(companyId, "ok", since24h),
      this.deliveryLogService.countRecentByStatus(
        companyId,
        "failed",
        since24h,
      ),
    ]);
    return `*24s kanal gönderimi:* ${okCount} başarılı · ${failedCount} hatalı`;
  }

  private buildChannelSummary(health: {
    channels: Array<{
      statusCode: string;
      label: string;
      openThreadCount: number;
      recentOutboundFailures24h: number;
    }>;
  }): string {
    const lines = health.channels
      .filter(
        (channel) => channel.statusCode === SocialConnectionStatusCode.Connected,
      )
      .map(
        (channel) =>
          `• ${channel.label}: ${channel.openThreadCount} açık · ${channel.recentOutboundFailures24h} hata (24s)`,
      );
    return lines.length > 0
      ? lines.join("\n")
      : "Bağlı kanal yok — hub panelinden OAuth ile bağlayın.";
  }

  private async buildRecentFailureSection(companyId: string): Promise<string> {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const rows = await this.deliveryLogService.list({
      companyId,
      status: "failed",
      since: since24h,
      limit: 5,
    });
    if (rows.length === 0) {
      return "";
    }
    const threadIds = rows.map((row) => row.messageThreadId);
    const links = await this.threadLinkRepository.find({
      where: { companyId, messageThreadId: In(threadIds) },
    });
    const labelByThread = new Map(
      links.map((link) => [link.messageThreadId, link.displayLabel]),
    );
    const lines = rows.map((row) => {
      const platform =
        PLATFORM_LABELS[row.platformCode as SocialPlatformCode] ??
        row.platformCode;
      const label = labelByThread.get(row.messageThreadId);
      const who = label ? ` · ${label}` : "";
      const preview = row.bodyTextPreview?.slice(0, 80) ?? "—";
      const err = row.errorMessage?.slice(0, 100) ?? "hata";
      return `• ${platform}${who}: _${preview}_ — ${err}`;
    });
    return `*Son hatalı gönderimler (24s)*\n${lines.join("\n")}`;
  }
}
