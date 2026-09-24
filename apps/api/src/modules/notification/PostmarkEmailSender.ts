import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotificationConfigurationService } from "./NotificationConfigurationService";

@Injectable()
export class PostmarkEmailSender {
  private readonly logger = new Logger(PostmarkEmailSender.name);

  public constructor(
    private readonly configService: ConfigService,
    private readonly notificationConfigurationService: NotificationConfigurationService,
  ) {}

  public isConfigured(): boolean {
    return Boolean(this.configService.get<string>("POSTMARK_SERVER_TOKEN")?.trim());
  }

  public async send(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<string | null> {
    const token = this.configService.get<string>("POSTMARK_SERVER_TOKEN");
    if (!token?.trim()) {
      throw new Error("POSTMARK_SERVER_TOKEN is not configured");
    }
    const from =
      this.configService.get<string>("POSTMARK_FROM") ??
      this.notificationConfigurationService.resolveSmtpConfig().from;
    const messageStream =
      this.configService.get<string>("POSTMARK_MESSAGE_STREAM") ?? "outbound";

    const response = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": token.trim(),
      },
      body: JSON.stringify({
        From: from,
        To: params.to,
        Subject: params.subject,
        HtmlBody: params.html,
        TextBody: params.text,
        MessageStream: messageStream,
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Postmark send failed: ${response.status} ${body}`);
    }
    const json = (await response.json()) as { MessageID?: string };
    return json.MessageID ?? null;
  }
}
