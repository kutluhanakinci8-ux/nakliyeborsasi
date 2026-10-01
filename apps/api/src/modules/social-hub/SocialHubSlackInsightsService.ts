import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CompanySocialSettingsEntity } from "../../infrastructure/database/entities/CompanySocialSettingsEntity";
import { CompanySocialSlackNotifyDedupEntity } from "../../infrastructure/database/entities/CompanySocialSlackNotifyDedupEntity";
import { SocialHubOutboundDeliveryLogService } from "./SocialHubOutboundDeliveryLogService";
import { labelSocialPlatform } from "./socialHubPlatformLabels";
import { socialHubManualNotifyCooldownMinutes } from "./socialHubManualNotifyCooldown";
import { parseRoadmapInterestPlatformCodes } from "./socialHubRoadmapInterest";
import { formatRoadmapInterestLabels } from "./socialHubRoadmapDigest";
import { isRoadmapPlatformCode } from "./socialHubRoadmapInterest";

const HEALTH_ALERT_DEDUP_PREFIX = "health_alert:";
const OUTBOUND_FAILURE_DEDUP_PREFIX = "outbound_fail:";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export type SocialHubChannelOutboundStat = {
  platformCode: string;
  label: string;
  ok: number;
  failed: number;
  successRatePercent: number;
};

@Injectable()
export class SocialHubSlackInsightsService {
  public constructor(
    @InjectRepository(CompanySocialSettingsEntity)
    private readonly settingsRepository: Repository<CompanySocialSettingsEntity>,
    @InjectRepository(CompanySocialSlackNotifyDedupEntity)
    private readonly dedupRepository: Repository<CompanySocialSlackNotifyDedupEntity>,
    private readonly deliveryLogService: SocialHubOutboundDeliveryLogService,
  ) {}

  public async buildInsights(companyId: string) {
    const settings = await this.settingsRepository.findOne({
      where: { companyId },
    });
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since7d = new Date(Date.now() - WEEK_MS);
    const since30d = new Date(Date.now() - MONTH_MS);
    const [platformMap24h, platformMap7d, platformMap30d] = await Promise.all([
      this.deliveryLogService.summarizeRecentByPlatform(companyId, since24h),
      this.deliveryLogService.summarizeRecentByPlatform(companyId, since7d),
      this.deliveryLogService.summarizeRecentByPlatform(companyId, since30d),
    ]);
    const channelOutbound24h = this.mapPlatformStats(platformMap24h);
    const channelOutbound7d = this.mapPlatformStats(platformMap7d);
    const channelOutbound30d = this.mapPlatformStats(platformMap30d);
    const roadmapBetaOutbound24h = channelOutbound24h.filter((row) =>
      isRoadmapPlatformCode(row.platformCode),
    );
    const okCount = channelOutbound24h.reduce((sum, row) => sum + row.ok, 0);
    const failedCount = channelOutbound24h.reduce(
      (sum, row) => sum + row.failed,
      0,
    );
    const [healthSlack, outboundSlack] = await Promise.all([
      this.latestDedup(companyId, `${HEALTH_ALERT_DEDUP_PREFIX}%`),
      this.latestDedup(companyId, `${OUTBOUND_FAILURE_DEDUP_PREFIX}%`),
    ]);
    const roadmapCodes = parseRoadmapInterestPlatformCodes(
      settings?.roadmapInterestPlatformCodesJson,
    );
    return {
      healthAlertEmailLastSentAt:
        settings?.healthAlertLastSentAt?.toISOString() ?? null,
      lastHealthAlertStatus: settings?.lastHealthAlertStatus ?? null,
      slackDailyDigestLastSentAt:
        settings?.socialSlackDailyDigestLastSentAt?.toISOString() ?? null,
      slackHealthAlertLastSentAt: healthSlack?.toISOString() ?? null,
      slackOutboundFailureLastSentAt: outboundSlack?.toISOString() ?? null,
      weeklyEmailLastSentAt:
        settings?.socialHubWeeklyEmailLastSentAt?.toISOString() ?? null,
      outboundDeliveriesLast24h: {
        ok: okCount,
        failed: failedCount,
      },
      channelOutbound24h,
      roadmapBetaOutbound24h,
      channelOutbound7d,
      channelOutbound30d,
      outboundDeliveriesLast7d: {
        ok: channelOutbound7d.reduce((sum, row) => sum + row.ok, 0),
        failed: channelOutbound7d.reduce((sum, row) => sum + row.failed, 0),
      },
      outboundDeliveriesLast30d: {
        ok: channelOutbound30d.reduce((sum, row) => sum + row.ok, 0),
        failed: channelOutbound30d.reduce((sum, row) => sum + row.failed, 0),
      },
      manualNotifyCooldownMinutes: socialHubManualNotifyCooldownMinutes(),
      roadmapInterestPlatformCodes: roadmapCodes,
      roadmapInterestLabels: formatRoadmapInterestLabels(roadmapCodes),
    };
  }

  public buildInsightsCsv(
    insights: Awaited<ReturnType<SocialHubSlackInsightsService["buildInsights"]>>,
  ): string {
    const header = "section,key,value";
    const lines: string[] = [header];
    const push = (section: string, key: string, value: string | number) => {
      const text = String(value).replace(/"/g, '""');
      const needsQuote =
        text.includes(",") || text.includes("\n") || text.includes('"');
      lines.push(
        `${section},${key},${needsQuote ? `"${text}"` : text}`,
      );
    };
    push("summary", "ok24h", insights.outboundDeliveriesLast24h.ok);
    push("summary", "failed24h", insights.outboundDeliveriesLast24h.failed);
    push(
      "timestamps",
      "healthAlertEmailLastSentAt",
      insights.healthAlertEmailLastSentAt ?? "",
    );
    push(
      "timestamps",
      "slackDailyDigestLastSentAt",
      insights.slackDailyDigestLastSentAt ?? "",
    );
    push(
      "timestamps",
      "slackHealthAlertLastSentAt",
      insights.slackHealthAlertLastSentAt ?? "",
    );
    push(
      "timestamps",
      "slackOutboundFailureLastSentAt",
      insights.slackOutboundFailureLastSentAt ?? "",
    );
    push(
      "timestamps",
      "weeklyEmailLastSentAt",
      insights.weeklyEmailLastSentAt ?? "",
    );
    for (const row of insights.channelOutbound24h) {
      push("channel24h", row.platformCode, `${row.ok}/${row.failed} (${row.successRatePercent}%)`);
    }
    for (const row of insights.roadmapBetaOutbound24h) {
      push(
        "roadmapBeta24h",
        row.platformCode,
        `${row.ok}/${row.failed} (${row.successRatePercent}%)`,
      );
    }
    for (const row of insights.channelOutbound7d) {
      push("channel7d", row.platformCode, `${row.ok}/${row.failed} (${row.successRatePercent}%)`);
    }
    push("summary", "ok7d", insights.outboundDeliveriesLast7d.ok);
    push("summary", "failed7d", insights.outboundDeliveriesLast7d.failed);
    for (const row of insights.channelOutbound30d) {
      push(
        "channel30d",
        row.platformCode,
        `${row.ok}/${row.failed} (${row.successRatePercent}%)`,
      );
    }
    push("summary", "ok30d", insights.outboundDeliveriesLast30d.ok);
    push("summary", "failed30d", insights.outboundDeliveriesLast30d.failed);
    push(
      "config",
      "manualNotifyCooldownMinutes",
      insights.manualNotifyCooldownMinutes,
    );
    push(
      "roadmap",
      "interestLabels",
      insights.roadmapInterestLabels.join("; "),
    );
    return lines.join("\n");
  }

  public mapPlatformStats(
    platformMap: Map<string, { ok: number; failed: number }>,
  ): SocialHubChannelOutboundStat[] {
    return [...platformMap.entries()]
      .map(([platformCode, stats]) => {
        const total = stats.ok + stats.failed;
        const successRatePercent =
          total > 0 ? Math.round((stats.ok / total) * 100) : 100;
        return {
          platformCode,
          label: labelSocialPlatform(platformCode),
          ok: stats.ok,
          failed: stats.failed,
          successRatePercent,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label, "tr"));
  }

  private async latestDedup(
    companyId: string,
    dedupKeyPattern: string,
  ): Promise<Date | null> {
    const row = await this.dedupRepository
      .createQueryBuilder("dedup")
      .where("dedup.companyId = :companyId", { companyId })
      .andWhere("dedup.dedupKey LIKE :pattern", { pattern: dedupKeyPattern })
      .orderBy("dedup.lastSentAt", "DESC")
      .getOne();
    return row?.lastSentAt ?? null;
  }
}
