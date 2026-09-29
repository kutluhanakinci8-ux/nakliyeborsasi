import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  resolveWhatsappBridgeDelivery,
  type WhatsappBridgeDeliverySnapshot,
} from "@nakliyeborsasi/core";
import { CompanyMessagingSettingsEntity } from "../../infrastructure/database/entities/CompanyMessagingSettingsEntity";

export type WhatsappBridgeDeliverResult =
  | { ok: true }
  | { ok: false; reason: string; httpStatus?: number };

@Injectable()
export class MessagingWhatsappBridgeService {
  private readonly logger = new Logger(MessagingWhatsappBridgeService.name);

  public constructor(
    @InjectRepository(CompanyMessagingSettingsEntity)
    private readonly settingsRepository: Repository<CompanyMessagingSettingsEntity>,
    private readonly configService: ConfigService,
  ) {}

  public getDeliverySnapshot(): WhatsappBridgeDeliverySnapshot {
    return resolveWhatsappBridgeDelivery({
      twilioAccountSid: this.configService.get<string>("TWILIO_ACCOUNT_SID"),
      twilioAuthToken: this.configService.get<string>("TWILIO_AUTH_TOKEN"),
      twilioWhatsappFrom: this.configService.get<string>("TWILIO_WHATSAPP_FROM"),
      twilioContentSid: this.configService.get<string>("TWILIO_WHATSAPP_CONTENT_SID"),
      webhookUrl: this.configService.get<string>(
        "MESSAGING_WHATSAPP_BRIDGE_WEBHOOK_URL",
      ),
    });
  }

  public isDeliveryConfigured(): boolean {
    return this.getDeliverySnapshot().deliveryConfigured;
  }

  public notifyMessageCreated(
    companyId: string,
    payload: { threadId: string; bodyPreview: string },
  ): void {
    void this.deliver(companyId, payload).then((result) => {
      if (!result.ok) {
        this.logger.warn(
          `WhatsApp bridge failed company=${companyId}: ${result.reason}`,
        );
      }
    });
  }

  public async sendTestNotification(
    companyId: string,
  ): Promise<WhatsappBridgeDeliverResult> {
    const settings = await this.settingsRepository.findOne({
      where: { companyId },
    });
    if (!settings?.whatsappBridgeEnabled || !settings.whatsappNotifyE164) {
      return { ok: false, reason: "WhatsApp köprüsü etkin değil veya numara yok." };
    }
    const snapshot = this.getDeliverySnapshot();
    if (!snapshot.deliveryConfigured) {
      return { ok: false, reason: snapshot.deliveryWarningTr ?? "Gönderim yapılandırılmadı." };
    }
    return this.deliver(companyId, {
      threadId: "test",
      bodyPreview:
        "Test bildirimi — Lerta firma sohbeti WhatsApp köprüsü çalışıyor.",
    });
  }

  private async deliver(
    companyId: string,
    payload: { threadId: string; bodyPreview: string },
  ): Promise<WhatsappBridgeDeliverResult> {
    const settings = await this.settingsRepository.findOne({
      where: { companyId },
    });
    if (!settings?.whatsappBridgeEnabled || !settings.whatsappNotifyE164) {
      return { ok: false, reason: "Köprü kapalı veya numara tanımlı değil." };
    }
    const to = settings.whatsappNotifyE164.replace(/\s/g, "");
    const webBase =
      process.env.MESSAGING_WEB_PUBLIC_URL?.trim() ??
      process.env.WEB_PUBLIC_BASE_URL?.trim() ??
      "https://app.lerta.com.tr";
    const url =
      payload.threadId === "test"
        ? `${webBase.replace(/\/$/, "")}/messaging?tab=chat`
        : `${webBase.replace(/\/$/, "")}/messaging?tab=chat&threadId=${encodeURIComponent(payload.threadId)}`;
    const text = `Lerta firma sohbeti: ${payload.bodyPreview.slice(0, 200)}\n${url}`;

    const accountSid = this.configService.get<string>("TWILIO_ACCOUNT_SID")?.trim();
    const authToken = this.configService.get<string>("TWILIO_AUTH_TOKEN")?.trim();
    const from = this.configService.get<string>("TWILIO_WHATSAPP_FROM")?.trim();
    if (accountSid && authToken && from) {
      const toWhatsApp = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
      const contentSid = this.configService
        .get<string>("TWILIO_WHATSAPP_CONTENT_SID")
        ?.trim();
      const params = new URLSearchParams({
        To: toWhatsApp,
        From: from,
      });
      if (contentSid) {
        params.set("ContentSid", contentSid);
        params.set(
          "ContentVariables",
          JSON.stringify({ "1": text.slice(0, 1600) }),
        );
      } else {
        params.set("Body", text);
      }
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
            "content-type": "application/x-www-form-urlencoded",
          },
          body: params,
          signal: AbortSignal.timeout(15_000),
        },
      );
      if (!response.ok) {
        const detail = await response.text();
        this.logger.warn(
          `Twilio WhatsApp HTTP ${response.status}: ${detail.slice(0, 400)}`,
        );
        if (
          !contentSid &&
          detail.includes("21654") &&
          detail.includes("ContentSid")
        ) {
          return {
            ok: false,
            httpStatus: response.status,
            reason:
              "Twilio 21654: TWILIO_WHATSAPP_CONTENT_SID gerekli (Content Template, tek alan {{1}}).",
          };
        }
        return {
          ok: false,
          httpStatus: response.status,
          reason: `Twilio HTTP ${response.status}: ${detail.slice(0, 200)}`,
        };
      }
      return { ok: true };
    }

    const hook = this.configService
      .get<string>("MESSAGING_WHATSAPP_BRIDGE_WEBHOOK_URL")
      ?.trim();
    if (!hook) {
      return {
        ok: false,
        reason: "Twilio veya MESSAGING_WHATSAPP_BRIDGE_WEBHOOK_URL yapılandırılmadı.",
      };
    }
    const response = await fetch(hook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        companyId,
        toE164: to,
        text,
        threadId: payload.threadId,
        test: payload.threadId === "test",
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      const detail = await response.text();
      return {
        ok: false,
        httpStatus: response.status,
        reason: `Webhook HTTP ${response.status}: ${detail.slice(0, 200)}`,
      };
    }
    return { ok: true };
  }
}
