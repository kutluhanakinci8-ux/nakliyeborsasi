import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CompanyMessagingSettingsEntity } from "../../infrastructure/database/entities/CompanyMessagingSettingsEntity";
import { CompanySocialSettingsEntity } from "../../infrastructure/database/entities/CompanySocialSettingsEntity";

@Injectable()
export class SocialHubSlackNotificationService {
  private readonly logger = new Logger(SocialHubSlackNotificationService.name);

  public constructor(
    @InjectRepository(CompanySocialSettingsEntity)
    private readonly socialSettingsRepository: Repository<CompanySocialSettingsEntity>,
    @InjectRepository(CompanyMessagingSettingsEntity)
    private readonly messagingSettingsRepository: Repository<CompanyMessagingSettingsEntity>,
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
    const webhook = await this.resolveWebhookUrl(params.companyId);
    if (!webhook) {
      return;
    }
    const webBase =
      process.env.WEB_PUBLIC_BASE_URL?.trim() ?? "https://app.lerta.com.tr";
    const messagingUrl = `${webBase.replace(/\/$/, "")}/messaging?tab=chat&threadId=${encodeURIComponent(params.threadId)}`;
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
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        this.logger.warn(`Social hub Slack HTTP ${response.status}`);
      }
    } catch (error) {
      this.logger.warn(
        `Social hub Slack failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
