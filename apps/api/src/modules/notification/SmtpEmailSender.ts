import {
  BadGatewayException,
  Injectable,
  Logger,
} from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { NotificationConfigurationService } from "./NotificationConfigurationService";
import {
  buildBrandedPlainText,
  isLertaBrandedOutboundHtml,
  type OutboundWrapBranding,
} from "./MailOutboundHtmlTemplate";
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
    /** Ham kullanıcı metni; branded HTML gönderiminde SMTP text parçası üretilmez. */
    text?: string;
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
    outboundBranding?: OutboundWrapBranding;
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
      const brandedHtml = isLertaBrandedOutboundHtml(params.html);
      const mail: nodemailer.SendMailOptions = {
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
        replyTo: params.replyTo?.trim() || undefined,
        inReplyTo: params.inReplyTo,
        references: params.references,
        attachments: params.attachments?.map((file) => ({
          filename: file.filename,
          content: file.content,
          contentType: file.contentType,
        })),
      };
      if (brandedHtml) {
        mail.text = buildBrandedPlainText(
          headerFrom,
          params.text,
          params.outboundBranding,
        );
        mail.headers = {
          ...(mail.headers ?? {}),
          "X-Lerta-Posta-Outbound": "v2",
        };
      } else if (params.text?.trim()) {
        mail.text = params.text;
      }
      const result = await transport.sendMail(mail);
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
