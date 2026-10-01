import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CompanyRoleCode, SocialConnectionStatusCode } from "@nakliyeborsasi/core";
import { CompanySocialConnectionEntity } from "../../infrastructure/database/entities/CompanySocialConnectionEntity";
import { CompanySocialSettingsEntity } from "../../infrastructure/database/entities/CompanySocialSettingsEntity";
import { CompanyMembershipEntity } from "../../infrastructure/database/entities/CompanyMembershipEntity";
import { SocialHubConnectionHealthService } from "./SocialHubConnectionHealthService";
import { OperationalNotificationService } from "../notification/OperationalNotificationService";
import {
  adjustOverallForFailureThresholds,
  shouldSendHealthAlert,
  type HealthAlertThresholdSettings,
} from "./socialHubHealthAlertThresholds";
import { SocialHubSlackNotificationService } from "./SocialHubSlackNotificationService";
import { mergeHealthAlertChannels } from "./socialHubHealthAlertChannels";

@Injectable()
export class SocialHubHealthAlertService {
  public constructor(
    private readonly connectionHealthService: SocialHubConnectionHealthService,
    @InjectRepository(CompanySocialSettingsEntity)
    private readonly socialSettingsRepository: Repository<CompanySocialSettingsEntity>,
    @InjectRepository(CompanySocialConnectionEntity)
    private readonly connectionRepository: Repository<CompanySocialConnectionEntity>,
    @InjectRepository(CompanyMembershipEntity)
    private readonly membershipRepository: Repository<CompanyMembershipEntity>,
    private readonly operationalNotificationService: OperationalNotificationService,
    private readonly slackNotificationService: SocialHubSlackNotificationService,
  ) {}

  public async runSweep(): Promise<number> {
    const companyIds = await this.connectionRepository
      .createQueryBuilder("connection")
      .select("DISTINCT connection.companyId", "companyId")
      .where("connection.statusCode = :status", {
        status: SocialConnectionStatusCode.Connected,
      })
      .limit(80)
      .getRawMany<{ companyId: string }>();
    let sent = 0;
    for (const row of companyIds) {
      if (await this.evaluateCompany(row.companyId)) {
        sent += 1;
      }
    }
    return sent;
  }

  public async evaluateCompany(companyId: string): Promise<boolean> {
    const settings = await this.socialSettingsRepository.findOne({
      where: { companyId },
    });
    if (settings && settings.healthAlertsEnabled === false) {
      return false;
    }
    const health = await this.connectionHealthService.buildHealthDashboard(
      companyId,
    );
    const thresholdSettings: HealthAlertThresholdSettings = {
      healthAlertMinSeverity: settings?.healthAlertMinSeverity ?? "attention",
      healthAlertFailureThreshold: settings?.healthAlertFailureThreshold ?? 1,
      healthAlertPlatformThresholdsJson:
        settings?.healthAlertPlatformThresholdsJson ?? null,
    };
    const alertChannels = mergeHealthAlertChannels(health);
    const effectiveOverall = adjustOverallForFailureThresholds({
      overallStatus: health.overallStatus,
      channels: alertChannels,
      settings: thresholdSettings,
    });
    if (
      !shouldSendHealthAlert(effectiveOverall, thresholdSettings) ||
      effectiveOverall === "healthy"
    ) {
      if (settings?.lastHealthAlertStatus) {
        settings.lastHealthAlertStatus = null;
        await this.socialSettingsRepository.save(settings);
      }
      return false;
    }
    const now = Date.now();
    const lastSent = settings?.healthAlertLastSentAt?.getTime() ?? 0;
    const sameStatus = settings?.lastHealthAlertStatus === effectiveOverall;
    if (sameStatus && now - lastSent < 24 * 60 * 60 * 1000) {
      return false;
    }
    const summaryParts = alertChannels
      .filter(
        (channel) =>
          channel.setupWarnings.length > 0 ||
          channel.tokenHealth === "expired" ||
          channel.tokenHealth === "expiring_soon",
      )
      .map((channel) => {
        const warnings = [...channel.setupWarnings];
        if (channel.tokenHealth === "expired") {
          warnings.push("Token süresi doldu");
        } else if (channel.tokenHealth === "expiring_soon") {
          warnings.push("Token süresi yakın");
        }
        const betaTag = channel.isRoadmapBeta ? " (beta)" : "";
        return `${channel.label}${betaTag}: ${warnings.join("; ")}`;
      });
    const failureParts = alertChannels
      .filter((channel) => channel.recentOutboundFailures24h > 0)
      .map(
        (channel) =>
          `${channel.label}${channel.isRoadmapBeta ? " (beta)" : ""}: ${channel.recentOutboundFailures24h} gönderim hatası (24s)`,
      );
    const summary = [...summaryParts, ...failureParts].join(" | ");
    const webBase =
      process.env.WEB_PUBLIC_BASE_URL?.trim() ?? "https://app.lerta.com.tr";
    const hubUrl = `${webBase.replace(/\/$/, "")}/hesap/sosyal-medya`;
    await this.slackNotificationService.postHealthAlert({
      companyId,
      overallStatus: effectiveOverall,
      summary,
      hubUrl,
    });
    await this.notifyOwnersEmail(companyId, effectiveOverall, summary, hubUrl);
    const row =
      settings ??
      this.socialSettingsRepository.create({
        companyId,
        inboxEnabled: true,
        publishingEnabled: true,
        dispatcherCanReply: false,
        dispatcherCanPublish: false,
        ownerApprovalRequired: true,
        kvkkAcceptedAt: null,
        healthAlertsEnabled: true,
        healthAlertLastSentAt: null,
        lastHealthAlertStatus: null,
        healthAlertMinSeverity: "attention",
        healthAlertFailureThreshold: 1,
        healthAlertPlatformThresholdsJson: null,
      });
    row.healthAlertLastSentAt = new Date();
    row.lastHealthAlertStatus = effectiveOverall;
    await this.socialSettingsRepository.save(row);
    return true;
  }

  private async notifyOwnersEmail(
    companyId: string,
    overallStatus: string,
    summary: string,
    hubUrl: string,
  ): Promise<void> {
    const owners = await this.membershipRepository.find({
      where: {
        companyId,
        roleCode: CompanyRoleCode.CompanyOwner,
      },
    });
    if (owners.length === 0) {
      return;
    }
    const preview = `Sosyal kanal sağlığı: ${overallStatus}. ${summary || "Detaylar hub panelinde."}`;
    await this.operationalNotificationService.afterSocialHubHealthDegraded({
      companyId,
      ownerUserIds: owners.map((row) => row.userId),
      overallStatus,
      summary: preview,
      hubUrl,
    });
  }
}
