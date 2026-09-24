import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { NotificationConfigurationService } from "./NotificationConfigurationService";

@Injectable()
export class SmtpEmailSender {
  private readonly logger = new Logger(SmtpEmailSender.name);

  public constructor(
    private readonly notificationConfigurationService: NotificationConfigurationService,
  ) {}

  public async send(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
    from?: string;
    replyTo?: string;
  }): Promise<string | null> {
    if (!this.notificationConfigurationService.isEmailEnabled()) {
      this.logger.warn(`EMAIL_ENABLED=false — skipped send to ${params.to}`);
      return null;
    }
    const smtp = this.notificationConfigurationService.resolveSmtpConfig();
    const transport = nodemailer.createTransport(
      this.notificationConfigurationService.resolveSmtpTransportOptions(),
    );
    const result = await transport.sendMail({
      from: params.from?.trim() || smtp.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo?.trim() || undefined,
    });
    return result.messageId ?? null;
  }
}
