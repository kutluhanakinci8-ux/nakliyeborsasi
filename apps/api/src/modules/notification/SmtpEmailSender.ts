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
    cc?: string;
    bcc?: string;
    subject: string;
    html: string;
    text: string;
    from?: string;
    replyTo?: string;
    inReplyTo?: string;
    references?: string;
    attachments?: {
      filename: string;
      content: Buffer;
      contentType?: string;
    }[];
  }): Promise<string | null> {
    if (!this.notificationConfigurationService.isEmailEnabled()) {
      this.logger.warn(`EMAIL_ENABLED=false — skipped send to ${params.to}`);
      return null;
    }
    const smtp = this.notificationConfigurationService.resolveSmtpConfig();
    const transport = nodemailer.createTransport(
      this.notificationConfigurationService.resolveSmtpTransportOptions(),
    );
    const headerFrom = params.from?.trim() || smtp.from;
    const result = await transport.sendMail({
      from: headerFrom,
      to: params.to,
      cc: params.cc?.trim() || undefined,
      bcc: params.bcc?.trim() || undefined,
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo?.trim() || undefined,
      inReplyTo: params.inReplyTo,
      references: params.references,
      attachments: params.attachments?.map((file) => ({
        filename: file.filename,
        content: file.content,
        contentType: file.contentType,
      })),
    });
    return result.messageId ?? null;
  }
}
