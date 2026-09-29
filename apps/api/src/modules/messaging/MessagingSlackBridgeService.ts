import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CompanyMessagingSettingsEntity } from "../../infrastructure/database/entities/CompanyMessagingSettingsEntity";

@Injectable()
export class MessagingSlackBridgeService {
  private readonly logger = new Logger(MessagingSlackBridgeService.name);

  public constructor(
    @InjectRepository(CompanyMessagingSettingsEntity)
    private readonly settingsRepository: Repository<CompanyMessagingSettingsEntity>,
  ) {}

  public notifyMessageCreated(
    companyId: string,
    payload: {
      threadId: string;
      messageId: string;
      bodyPreview: string;
      senderCompanyId: string;
      freightListingId: string | null;
    },
  ): void {
    void this.deliver(companyId, payload).catch((error) => {
      this.logger.warn(
        `Slack bridge failed company=${companyId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });
  }

  private async deliver(
    companyId: string,
    payload: {
      threadId: string;
      messageId: string;
      bodyPreview: string;
      senderCompanyId: string;
      freightListingId: string | null;
    },
  ): Promise<void> {
    const settings = await this.settingsRepository.findOne({
      where: { companyId },
    });
    if (!settings?.slackBridgeEnabled || !settings.slackIncomingWebhookUrl) {
      return;
    }
    const webBase =
      process.env.MESSAGING_WEB_PUBLIC_URL?.trim() ??
      process.env.WEB_PUBLIC_BASE_URL?.trim() ??
      "https://app.lerta.com.tr";
    const listingQuery = payload.freightListingId
      ? `&listingId=${encodeURIComponent(payload.freightListingId)}`
      : "";
    const url = `${webBase.replace(/\/$/, "")}/messaging?tab=chat&threadId=${encodeURIComponent(payload.threadId)}${listingQuery}`;
    const body = {
      text: `Yeni firma mesajı: ${payload.bodyPreview.slice(0, 280)}`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Lerta firma sohbeti*\n${payload.bodyPreview.slice(0, 500)}`,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Sohbete git" },
              url,
            },
          ],
        },
      ],
    };
    const response = await fetch(settings.slackIncomingWebhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      this.logger.warn(`Slack incoming webhook HTTP ${response.status}`);
    }
  }
}
