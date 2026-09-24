import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PostmarkEmailSender } from "./PostmarkEmailSender";
import { SmtpEmailSender } from "./SmtpEmailSender";

export type EmailDeliveryMode = "smtp" | "postmark";

@Injectable()
export class EmailDeliveryService {
  public constructor(
    private readonly configService: ConfigService,
    private readonly smtpEmailSender: SmtpEmailSender,
    private readonly postmarkEmailSender: PostmarkEmailSender,
  ) {}

  public resolveMode(): EmailDeliveryMode {
    const explicit = this.configService
      .get<string>("EMAIL_DELIVERY_PROVIDER")
      ?.trim()
      .toLowerCase();
    if (explicit === "smtp") {
      return "smtp";
    }
    if (
      explicit === "postmark" &&
      this.postmarkEmailSender.isConfigured()
    ) {
      return "postmark";
    }
    return "smtp";
  }

  public async send(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{ messageId: string | null; provider: EmailDeliveryMode }> {
    const mode = this.resolveMode();
    if (mode === "postmark") {
      const messageId = await this.postmarkEmailSender.send(params);
      return { messageId, provider: "postmark" };
    }
    const messageId = await this.smtpEmailSender.send(params);
    return { messageId, provider: "smtp" };
  }
}
