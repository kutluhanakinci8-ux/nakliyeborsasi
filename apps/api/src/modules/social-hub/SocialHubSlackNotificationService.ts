import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CompanyMessagingSettingsEntity } from "../../infrastructure/database/entities/CompanyMessagingSettingsEntity";
import { CompanySocialSettingsEntity } from "../../infrastructure/database/entities/CompanySocialSettingsEntity";
import { CompanySocialSlackNotifyDedupEntity } from "../../infrastructure/database/entities/CompanySocialSlackNotifyDedupEntity";

const OUTBOUND_FAILURE_DEDUP_PREFIX = "outbound_fail:";

@Injectable()
export class SocialHubSlackNotificationService {
  private readonly logger = new Logger(SocialHubSlackNotificationService.name);

  public constructor(
    @InjectRepository(CompanySocialSettingsEntity)
    private readonly socialSettingsRepository: Repository<CompanySocialSettingsEntity>,
    @InjectRepository(CompanyMessagingSettingsEntity)
    private readonly messagingSettingsRepository: Repository<CompanyMessagingSettingsEntity>,
    @InjectRepository(CompanySocialSlackNotifyDedupEntity)
    private readonly dedupRepository: Repository<CompanySocialSlackNotifyDedupEntity>,
  ) {}

  public async postHealthAlert(params: {
    companyId: string;
    overallStatus: string;
    summary: string;
    hubUrl: string;
  }): Promise<void> {
    const webhook = await this.resolveWebhookUrl(params.companyId);
    if (!webhook) {
      return;
    }
    const text = `Sosyal hub sağlık: *${params.overallStatus}*${
      params.summary ? `\n${params.summary}` : ""
    }`;
    await this.postWebhook(webhook, {
      text,
      blocks: [
        { type: "section", text: { type: "mrkdwn", text } },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Sosyal hub" },
              url: params.hubUrl,
            },
          ],
        },
      ],
    });
  }

  public async postOutboundFailure(params: {
    companyId: string;
    platformCode: string;
    bodyPreview: string;
    errorMessage: string;
    threadId: string;
  }): Promise<void> {
    const settings = await this.socialSettingsRepository.findOne({
      where: { companyId: params.companyId },
    });
    if (!settings?.socialSlackNotifyOutboundFailures) {
      return;
    }
    const cooldownMinutes = Math.min(
      Math.max(settings.socialSlackOutboundFailureCooldownMinutes ?? 15, 1),
      24 * 60,
    );
    const dedupKey = `${OUTBOUND_FAILURE_DEDUP_PREFIX}${params.threadId}`;
    const existing = await this.dedupRepository.findOne({
      where: { companyId: params.companyId, dedupKey },
    });
    const now = Date.now();
    if (
      existing &&
      now - existing.lastSentAt.getTime() < cooldownMinutes * 60 * 1000
    ) {
      return;
    }
    const webhook = await this.resolveWebhookUrl(params.companyId);
    if (!webhook) {
      return;
    }
    const messagingUrl = this.buildMessagingThreadUrl(params.threadId);
    const text = `Sosyal kanal gönderimi başarısız (*${params.platformCode}*)\n${params.errorMessage}\n>${params.bodyPreview.slice(0, 200)}`;
    await this.postWebhook(webhook, {
      text,
      blocks: [
        { type: "section", text: { type: "mrkdwn", text } },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Konuşmayı aç" },
              url: messagingUrl,
            },
          ],
        },
      ],
    });
    await this.dedupRepository.save(
      this.dedupRepository.create({
        companyId: params.companyId,
        dedupKey,
        lastSentAt: new Date(),
      }),
    );
  }

  public async postTestMessage(companyId: string): Promise<{
    ok: boolean;
    message: string;
    usedDedicatedWebhook: boolean;
  }> {
    const social = await this.socialSettingsRepository.findOne({
      where: { companyId },
    });
    const dedicated = social?.socialSlackWebhookUrl?.trim();
    const webhook = await this.resolveWebhookUrl(companyId);
    if (!webhook) {
      return {
        ok: false,
        message:
          "Slack webhook tanımlı değil. Sosyal hub webhook girin veya Mesajlar köprüsünü etkinleştirin.",
        usedDedicatedWebhook: false,
      };
    }
    const hubUrl = this.buildSocialHubUrl();
    const text =
      "Sosyal hub Slack testi — bağlantı çalışıyor. Bu mesajı yönetici panelinden gönderdiniz.";
    await this.postWebhookOrThrow(webhook, {
      text,
      blocks: [
        { type: "section", text: { type: "mrkdwn", text } },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Sosyal hub" },
              url: hubUrl,
            },
          ],
        },
      ],
    });
    return {
      ok: true,
      message: "Test mesajı Slack kanalına gönderildi.",
      usedDedicatedWebhook: Boolean(dedicated),
    };
  }

  public buildMessagingThreadUrl(threadId: string): string {
    const webBase =
      process.env.WEB_PUBLIC_BASE_URL?.trim() ?? "https://app.lerta.com.tr";
    return `${webBase.replace(/\/$/, "")}/messaging?threadId=${encodeURIComponent(threadId)}`;
  }

  private buildSocialHubUrl(): string {
    const webBase =
      process.env.WEB_PUBLIC_BASE_URL?.trim() ?? "https://app.lerta.com.tr";
    return `${webBase.replace(/\/$/, "")}/hesap/sosyal-medya`;
  }

  private async resolveWebhookUrl(companyId: string): Promise<string | null> {
    const social = await this.socialSettingsRepository.findOne({
      where: { companyId },
    });
    const dedicated = social?.socialSlackWebhookUrl?.trim();
    if (dedicated) {
      return dedicated;
    }
    if (social?.socialSlackUseMessagingFallback === false) {
      return null;
    }
    const messaging = await this.messagingSettingsRepository.findOne({
      where: { companyId },
    });
    if (messaging?.slackBridgeEnabled && messaging.slackIncomingWebhookUrl) {
      return messaging.slackIncomingWebhookUrl;
    }
    return null;
  }

  private async postWebhook(
    webhookUrl: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.postWebhookOrThrow(webhookUrl, body);
    } catch (error) {
      this.logger.warn(
        `Social hub Slack failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async postWebhookOrThrow(
    webhookUrl: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`Slack HTTP ${response.status}`);
    }
  }
}
