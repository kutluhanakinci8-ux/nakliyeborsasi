import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CompanyEntity } from "../../infrastructure/database/entities/CompanyEntity";
import { UserAccountEntity } from "../../infrastructure/database/entities/UserAccountEntity";
import { EmailOutboxService } from "./EmailOutboxService";
import {
  EmailRecipientKind,
  NotificationEventCode,
} from "./NotificationEventCode";
import { MailSupportTicketTopic } from "../../infrastructure/database/entities/MailOrganizationSupportTicketEntity";

const TOPIC_LABELS: Record<MailSupportTicketTopic, string> = {
  technical: "Teknik destek",
  billing: "Faturalama",
  sales: "Satış / plan",
  general: "Genel",
};

@Injectable()
export class MailSupportTicketNotificationService {
  private readonly logger = new Logger(MailSupportTicketNotificationService.name);

  public constructor(
    private readonly emailOutboxService: EmailOutboxService,
    private readonly configService: ConfigService,
    @InjectRepository(CompanyEntity)
    private readonly companyRepository: Repository<CompanyEntity>,
    @InjectRepository(UserAccountEntity)
    private readonly userRepository: Repository<UserAccountEntity>,
  ) {}

  public async notifySupportDeskNewTicket(params: {
    ticketId: string;
    publicRef: string;
    organizationId: string;
    createdByUserId: string;
    topic: MailSupportTicketTopic;
    subject: string;
    messagePreview: string;
  }): Promise<void> {
    const recipients = this.resolveSupportRecipients();
    if (recipients.length === 0) {
      return;
    }
    const company = await this.companyRepository.findOne({
      where: { id: params.organizationId },
    });
    const user = await this.userRepository.findOne({
      where: { id: params.createdByUserId },
    });
    const consoleBase =
      this.configService.get<string>("MAIL_CONSOLE_PUBLIC_URL")?.trim() ||
      "https://yonetim.lerta.com.tr";
    const operatorTicketUrl = `${consoleBase.replace(/\/$/, "")}/operator/destek/${params.ticketId}`;
    const topicLabel = TOPIC_LABELS[params.topic] ?? params.topic;
    const preview =
      params.messagePreview.length > 500
        ? `${params.messagePreview.slice(0, 497)}…`
        : params.messagePreview;

    for (const email of recipients) {
      try {
        await this.emailOutboxService.enqueue({
          eventCode: NotificationEventCode.MailSupportTicketOpened,
          recipientKind: EmailRecipientKind.Admin,
          recipientEmail: email,
          locale: "tr",
          payload: {
            ticketRef: params.publicRef,
            ticketSubject: params.subject,
            topicLabel,
            companyLegalName: company?.legalName ?? params.organizationId,
            requesterEmail: user?.emailAddress ?? "—",
            messagePreview: preview,
            operatorTicketUrl,
            occurredAt: new Date().toISOString(),
          },
          idempotencyKey: `MAIL_SUPPORT_TICKET_OPEN:${params.ticketId}:${email}`,
          metadata: {
            organizationId: params.organizationId,
            ticketId: params.ticketId,
          },
        });
      } catch (error) {
        this.logger.warn(
          `Support ticket notify skip ${email}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }
  }

  public async notifyCustomerStaffReply(params: {
    ticketId: string;
    messageId: string;
    publicRef: string;
    organizationId: string;
    createdByUserId: string;
    ticketSubject: string;
    staffMessagePreview: string;
  }): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: params.createdByUserId },
    });
    if (!user?.emailAddress) {
      return;
    }
    const company = await this.companyRepository.findOne({
      where: { id: params.organizationId },
    });
    const consoleBase =
      this.configService.get<string>("MAIL_CONSOLE_PUBLIC_URL")?.trim() ||
      "https://yonetim.lerta.com.tr";
    const ticketUrl = `${consoleBase.replace(/\/$/, "")}/destek/talepler/${params.ticketId}`;
    const preview =
      params.staffMessagePreview.length > 800
        ? `${params.staffMessagePreview.slice(0, 797)}…`
        : params.staffMessagePreview;

    try {
      await this.emailOutboxService.enqueue({
        eventCode: NotificationEventCode.MailSupportTicketStaffReply,
        recipientKind: EmailRecipientKind.User,
        recipientEmail: user.emailAddress,
        locale: user.preferredLocale ?? "tr",
        payload: {
          displayName: user.displayName,
          emailAddress: user.emailAddress,
          ticketRef: params.publicRef,
          ticketSubject: params.ticketSubject,
          companyLegalName: company?.legalName ?? "",
          messagePreview: preview,
          ticketUrl,
          occurredAt: new Date().toISOString(),
        },
        idempotencyKey: `MAIL_SUPPORT_TICKET_STAFF:${params.messageId}:${user.id}`,
        metadata: {
          organizationId: params.organizationId,
          ticketId: params.ticketId,
          userId: user.id,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Support staff reply notify skip ${user.emailAddress}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private resolveSupportRecipients(): string[] {
    const raw =
      this.configService.get<string>("MAIL_SUPPORT_NOTIFY_EMAIL") ??
      "destek@lerta.com.tr";
    return raw
      .split(/[,;]/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
  }
}
