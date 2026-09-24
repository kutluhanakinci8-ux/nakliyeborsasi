import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmailSuppressionService } from "./EmailSuppressionService";
@Injectable()
export class EmailEspWebhookService {
  private readonly logger = new Logger(EmailEspWebhookService.name);

  public constructor(
    private readonly configService: ConfigService,
    private readonly emailSuppressionService: EmailSuppressionService,
  ) {}

  public verifyPostmarkToken(headerValue: string | undefined): boolean {
    const expected = this.configService.get<string>("POSTMARK_WEBHOOK_TOKEN");
    if (!expected?.trim()) {
      return true;
    }
    return headerValue === expected.trim();
  }

  public async handlePostmarkPayload(payload: Record<string, unknown>): Promise<void> {
    const recordType = String(payload.RecordType ?? payload.Type ?? "");
    const email = String(payload.Email ?? payload.Recipient ?? "");
    if (!email.includes("@")) {
      return;
    }

    if (recordType === "Bounce") {
      const bounceType = String(payload.Type ?? "HardBounce");
      const reason =
        bounceType.toLowerCase().includes("hard") ? "bounce_hard" : "bounce_soft";
      await this.emailSuppressionService.addSuppression({
        email,
        reason,
        source: "postmark_webhook",
        note: String(payload.Description ?? bounceType),
      });
      return;
    }

    if (recordType === "SpamComplaint") {
      await this.emailSuppressionService.addSuppression({
        email,
        reason: "complaint",
        source: "postmark_webhook",
        note: "Spam complaint",
      });
    }
  }

  public async handleSesNotification(payload: Record<string, unknown>): Promise<void> {
    const message =
      typeof payload.Message === "string"
        ? (JSON.parse(payload.Message) as Record<string, unknown>)
        : (payload.Message as Record<string, unknown> | undefined);
    if (!message) {
      return;
    }
    const notificationType = String(message.notificationType ?? "");
    const bounce = message.bounce as Record<string, unknown> | undefined;
    const recipients = (bounce?.bouncedRecipients as Array<{ emailAddress?: string }>) ?? [];
    if (notificationType !== "Bounce" || recipients.length === 0) {
      return;
    }
    const bounceType = String(bounce?.bounceType ?? "Permanent");
    const reason =
      bounceType === "Permanent" ? "bounce_hard" : "bounce_soft";
    for (const recipient of recipients) {
      if (!recipient.emailAddress) {
        continue;
      }
      await this.emailSuppressionService.addSuppression({
        email: recipient.emailAddress,
        reason,
        source: "ses_webhook",
        note: bounceType,
      });
    }
  }

  public async syncGmailBounceCandidates(
    messages: Array<{ from: string; subject: string; snippet: string }>,
  ): Promise<number> {
    let added = 0;
    for (const message of messages) {
      const from = message.from.toLowerCase();
      const subject = message.subject.toLowerCase();
      const isBounce =
        from.includes("mailer-daemon") ||
        from.includes("postmaster") ||
        subject.includes("delivery status") ||
        subject.includes("undelivered") ||
        subject.includes("failure notice");
      if (!isBounce) {
        continue;
      }
      const match = message.snippet.match(/[\w.+-]+@[\w.-]+\.\w+/);
      if (!match) {
        continue;
      }
      await this.emailSuppressionService.addSuppression({
        email: match[0],
        reason: "bounce_inferred",
        source: "gmail_sync",
        note: message.subject.slice(0, 200),
      });
      added += 1;
    }
    return added;
  }
}
