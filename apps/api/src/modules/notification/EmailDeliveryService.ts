import { Injectable } from "@nestjs/common";
import { SmtpEmailSender } from "./SmtpEmailSender";

export type EmailDeliveryMode = "smtp";

@Injectable()
export class EmailDeliveryService {
  public constructor(private readonly smtpEmailSender: SmtpEmailSender) {}

  public resolveMode(): EmailDeliveryMode {
    return "smtp";
  }

  public async send(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
    from?: string;
  }): Promise<{ messageId: string | null; provider: EmailDeliveryMode }> {
    const messageId = await this.smtpEmailSender.send(params);
    return { messageId, provider: "smtp" };
  }
}
