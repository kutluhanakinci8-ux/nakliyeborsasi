import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CompanyMessagingSettingsEntity } from "../../infrastructure/database/entities/CompanyMessagingSettingsEntity";

@Injectable()
export class MessagingWhatsappBridgeService {
  private readonly logger = new Logger(MessagingWhatsappBridgeService.name);

  public constructor(
    @InjectRepository(CompanyMessagingSettingsEntity)
    private readonly settingsRepository: Repository<CompanyMessagingSettingsEntity>,
    private readonly configService: ConfigService,
  ) {}

  public notifyMessageCreated(
    companyId: string,
    payload: { threadId: string; bodyPreview: string },
  ): void {
    void this.deliver(companyId, payload).catch((error) => {
      this.logger.warn(
        `WhatsApp bridge failed company=${companyId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });
  }

  private async deliver(
    companyId: string,
    payload: { threadId: string; bodyPreview: string },
  ): Promise<void> {
    const settings = await this.settingsRepository.findOne({
      where: { companyId },
    });
    if (!settings?.whatsappBridgeEnabled || !settings.whatsappNotifyE164) {
      return;
    }
    const to = settings.whatsappNotifyE164.replace(/\s/g, "");
    const webBase =
      process.env.MESSAGING_WEB_PUBLIC_URL?.trim() ??
      process.env.WEB_PUBLIC_BASE_URL?.trim() ??
      "https://app.lerta.com.tr";
    const url = `${webBase.replace(/\/$/, "")}/messaging?tab=chat&threadId=${encodeURIComponent(payload.threadId)}`;
    const text = `Lerta firma sohbeti: ${payload.bodyPreview.slice(0, 200)}\n${url}`;

    const accountSid = this.configService.get<string>("TWILIO_ACCOUNT_SID")?.trim();
    const authToken = this.configService.get<string>("TWILIO_AUTH_TOKEN")?.trim();
    const from = this.configService.get<string>("TWILIO_WHATSAPP_FROM")?.trim();
    if (accountSid && authToken && from) {
      const body = new URLSearchParams({
        To: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
        From: from,
        Body: text,
      });
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
            "content-type": "application/x-www-form-urlencoded",
          },
          body,
          signal: AbortSignal.timeout(15_000),
        },
      );
      if (!response.ok) {
        this.logger.warn(`Twilio WhatsApp HTTP ${response.status}`);
      }
      return;
    }

    const hook = this.configService
      .get<string>("MESSAGING_WHATSAPP_BRIDGE_WEBHOOK_URL")
      ?.trim();
    if (!hook) {
      return;
    }
    await fetch(hook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        companyId,
        toE164: to,
        text,
        threadId: payload.threadId,
      }),
      signal: AbortSignal.timeout(12_000),
    });
  }
}
