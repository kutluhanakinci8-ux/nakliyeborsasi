import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailMailboxEntity } from "../../infrastructure/database/entities/MailMailboxEntity";
import { MailOrganizationInboxService } from "./MailOrganizationInboxService";
import { MailInboxPreferencesService } from "./MailInboxPreferencesService";
import { SmtpEmailSender } from "./SmtpEmailSender";

const DIGEST_HOUR_IST = 8;

@Injectable()
export class MailInboxDigestService {
  private readonly logger = new Logger(MailInboxDigestService.name);

  public constructor(
    @InjectRepository(MailMailboxEntity)
    private readonly mailboxRepository: Repository<MailMailboxEntity>,
    private readonly mailOrganizationInboxService: MailOrganizationInboxService,
    private readonly mailInboxPreferencesService: MailInboxPreferencesService,
    private readonly smtpEmailSender: SmtpEmailSender,
  ) {}

  public async runDigestWindow(): Promise<{ sent: number }> {
    if (!this.isDigestWindow()) {
      return { sent: 0 };
    }
    const todayIst = this.istanbulDateString(new Date());
    const orgIds = await this.distinctOrganizationIds();
    let sent = 0;
    for (const organizationId of orgIds) {
      try {
        const didSend = await this.maybeSendForOrganization(
          organizationId,
          todayIst,
        );
        if (didSend) {
          sent += 1;
        }
      } catch (error) {
        this.logger.warn(
          `Digest org=${organizationId}: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    }
    return { sent };
  }

  private async maybeSendForOrganization(
    organizationId: string,
    todayIst: string,
  ): Promise<boolean> {
    const enabled =
      await this.mailInboxPreferencesService.isDailyDigestEnabled(
        organizationId,
      );
    if (!enabled) {
      return false;
    }
    const lastSent =
      await this.mailInboxPreferencesService.getLastDigestSentOn(
        organizationId,
      );
    if (lastSent === todayIst) {
      return false;
    }
    const summary =
      await this.mailOrganizationInboxService.getSummary(organizationId);
    if (!summary.primaryAddress || summary.unreadCount <= 0) {
      return false;
    }
    const subject = `Lerta Posta: ${summary.unreadCount} okunmamış posta`;
    const link = "https://posta.lerta.com.tr/mail";
    const text = [
      `Gelen kutunuzda ${summary.unreadCount} okunmamış posta var.`,
      "",
      `Webmail: ${link}`,
    ].join("\n");
    const html = `<p>Gelen kutunuzda <strong>${summary.unreadCount}</strong> okunmamış posta var.</p><p><a href="${link}">posta.lerta.com.tr/mail</a> adresinden okuyabilirsiniz.</p>`;
    await this.smtpEmailSender.send({
      to: summary.primaryAddress,
      subject,
      text,
      html,
    });
    await this.mailInboxPreferencesService.markDigestSent(
      organizationId,
      todayIst,
    );
    return true;
  }

  private async distinctOrganizationIds(): Promise<string[]> {
    const rows = await this.mailboxRepository
      .createQueryBuilder("m")
      .select("DISTINCT m.organizationId", "organizationId")
      .getRawMany<{ organizationId: string }>();
    return rows.map((row) => row.organizationId);
  }

  private isDigestWindow(): boolean {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Istanbul",
      hour: "numeric",
      hour12: false,
    }).formatToParts(new Date());
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? -1);
    return hour === DIGEST_HOUR_IST;
  }

  private istanbulDateString(date: Date): string {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Istanbul",
    }).format(date);
  }
}
