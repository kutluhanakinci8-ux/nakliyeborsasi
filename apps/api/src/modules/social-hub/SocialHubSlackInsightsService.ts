import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CompanySocialSettingsEntity } from "../../infrastructure/database/entities/CompanySocialSettingsEntity";
import { CompanySocialSlackNotifyDedupEntity } from "../../infrastructure/database/entities/CompanySocialSlackNotifyDedupEntity";
import { SocialHubOutboundDeliveryLogService } from "./SocialHubOutboundDeliveryLogService";

const HEALTH_ALERT_DEDUP_PREFIX = "health_alert:";
const OUTBOUND_FAILURE_DEDUP_PREFIX = "outbound_fail:";

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
    const [okCount, failedCount, healthSlack, outboundSlack] = await Promise.all([
      this.deliveryLogService.countRecentByStatus(companyId, "ok", since24h),
      this.deliveryLogService.countRecentByStatus(
        companyId,
        "failed",
        since24h,
      ),
      this.latestDedup(companyId, `${HEALTH_ALERT_DEDUP_PREFIX}%`),
      this.latestDedup(companyId, `${OUTBOUND_FAILURE_DEDUP_PREFIX}%`),
    ]);
    return {
      healthAlertEmailLastSentAt:
        settings?.healthAlertLastSentAt?.toISOString() ?? null,
      lastHealthAlertStatus: settings?.lastHealthAlertStatus ?? null,
      slackDailyDigestLastSentAt:
        settings?.socialSlackDailyDigestLastSentAt?.toISOString() ?? null,
      slackHealthAlertLastSentAt: healthSlack?.toISOString() ?? null,
      slackOutboundFailureLastSentAt: outboundSlack?.toISOString() ?? null,
      outboundDeliveriesLast24h: {
        ok: okCount,
        failed: failedCount,
      },
    };
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
