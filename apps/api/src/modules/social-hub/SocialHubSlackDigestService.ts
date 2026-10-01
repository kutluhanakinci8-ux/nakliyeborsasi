import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SocialConnectionStatusCode } from "@nakliyeborsasi/core";
import { CompanySocialSettingsEntity } from "../../infrastructure/database/entities/CompanySocialSettingsEntity";
import { SocialHubConnectionHealthService } from "./SocialHubConnectionHealthService";
import { SocialHubSlackNotificationService } from "./SocialHubSlackNotificationService";

const DIGEST_INTERVAL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class SocialHubSlackDigestService {
  private readonly logger = new Logger(SocialHubSlackDigestService.name);

  public constructor(
    @InjectRepository(CompanySocialSettingsEntity)
    private readonly settingsRepository: Repository<CompanySocialSettingsEntity>,
    private readonly connectionHealthService: SocialHubConnectionHealthService,
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
      try {
        const health = await this.connectionHealthService.buildHealthDashboard(
          settings.companyId,
        );
        const lines = health.channels
          .filter(
            (channel) =>
              channel.statusCode === SocialConnectionStatusCode.Connected,
          )
          .map(
            (channel) =>
              `• ${channel.label}: ${channel.openThreadCount} açık · ${channel.recentOutboundFailures24h} hata (24s)`,
          );
        const summary =
          lines.length > 0
            ? lines.join("\n")
            : "Bağlı kanal yok — hub panelinden OAuth ile bağlayın.";
        const posted = await this.slackNotificationService.postDailyDigest({
          companyId: settings.companyId,
          overallStatus: health.overallStatus,
          summary,
        });
        if (posted) {
          settings.socialSlackDailyDigestLastSentAt = new Date();
          await this.settingsRepository.save(settings);
          sent += 1;
        }
      } catch (error) {
        this.logger.warn(
          `Daily digest failed company=${settings.companyId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
    return sent;
  }
}
