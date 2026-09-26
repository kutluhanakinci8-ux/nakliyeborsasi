import {
  BadGatewayException,
  Injectable,
  Logger,
} from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { NotificationConfigurationService } from "./NotificationConfigurationService";
import { collectSmtpEnvelopeRecipients } from "./SmtpEnvelopeHelper";

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
    /** MAIL FROM — Lerta Post: teknik FQDN; From başlığı vanity kalır. */
    envelopeMailFrom?: string;
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
    const envelopeMailFrom = params.envelopeMailFrom?.trim() || undefined;
    const envelopeTo = collectSmtpEnvelopeRecipients({
      to: params.to,
      cc: params.cc,
      bcc: params.bcc,
    });
    try {
      const result = await transport.sendMail({
        from: headerFrom,
        ...(envelopeMailFrom
          ? {
              envelope: {
                from: envelopeMailFrom,
                to: envelopeTo.length > 0 ? envelopeTo : [params.to],
              },
            }
          : {}),
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
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`SMTP gönderim hatası: ${detail}`);
      throw new BadGatewayException(
        `Posta sunucusu gönderimi reddetti veya yanıt vermedi. (${detail.slice(0, 200)})`,
      );
    }
  }
}
