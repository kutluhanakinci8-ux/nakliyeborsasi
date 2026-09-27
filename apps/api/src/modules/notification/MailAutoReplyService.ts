import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailInboundMessageEntity } from "../../infrastructure/database/entities/MailInboundMessageEntity";
import { MailAutoReplyThrottleEntity } from "../../infrastructure/database/entities/MailAutoReplyThrottleEntity";
import { MailMailboxEntity } from "../../infrastructure/database/entities/MailMailboxEntity";
import { MailInboxPreferencesService } from "./MailInboxPreferencesService";
import { MailMailboxComposeService } from "./MailMailboxComposeService";

const THROTTLE_HOURS = 24;

@Injectable()
export class MailAutoReplyService {
  private readonly logger = new Logger(MailAutoReplyService.name);

  public constructor(
    private readonly mailInboxPreferencesService: MailInboxPreferencesService,
    private readonly mailMailboxComposeService: MailMailboxComposeService,
    @InjectRepository(MailAutoReplyThrottleEntity)
    private readonly throttleRepository: Repository<MailAutoReplyThrottleEntity>,
    @InjectRepository(MailMailboxEntity)
    private readonly mailboxRepository: Repository<MailMailboxEntity>,
  ) {}

  public async tryReplyForInbound(params: {
    organizationId: string;
    mailboxEmail: string;
    inbound: MailInboundMessageEntity;
  }): Promise<void> {
    const inbound = params.inbound;
    if (inbound.spamStatus === "blocked" || inbound.mailboxFolder !== "inbox") {
      return;
    }
    const prefs = await this.mailInboxPreferencesService.getAutoReplyConfig(
      params.organizationId,
    );
    if (!prefs.enabled || !prefs.bodyText?.trim()) {
      return;
    }
    if (!this.isWithinSchedule(prefs.activeFrom, prefs.activeUntil)) {
      return;
    }
    const from = params.inbound.fromAddress.trim().toLowerCase();
    if (!this.isEligibleSender(from, params.mailboxEmail)) {
      return;
    }
    if (this.looksLikeAutoMessage(inbound.subject)) {
      return;
    }
    if (
      await this.isOrganizationMailboxAddress(params.organizationId, from)
    ) {
      return;
    }
    if (await this.isThrottled(params.organizationId, from)) {
      return;
    }
    const bodyText = prefs.bodyText.trim();
    const subject = this.buildSubject(inbound.subject);
    try {
      await this.mailMailboxComposeService.compose({
        organizationId: params.organizationId,
        to: params.inbound.fromAddress,
        subject,
        text: bodyText,
        html: `<p>${escapeHtmlMinimal(bodyText).replace(/\n/g, "<br/>")}</p>`,
      });
      await this.recordThrottle(params.organizationId, from);
      this.logger.log(
        `Auto-reply sent org=${params.organizationId} to=${from}`,
      );
    } catch (error) {
      this.logger.warn(
        `Auto-reply failed org=${params.organizationId}: ${
          error instanceof Error ? error.message : "unknown"
        }`,
      );
    }
  }

  private isWithinSchedule(
    activeFrom: Date | null,
    activeUntil: Date | null,
  ): boolean {
    const now = Date.now();
    if (activeFrom && now < activeFrom.getTime()) {
      return false;
    }
    if (activeUntil && now > activeUntil.getTime()) {
      return false;
    }
    return true;
  }

  private isEligibleSender(from: string, mailboxEmail: string): boolean {
    if (!from.includes("@")) {
      return false;
    }
    if (from === mailboxEmail.trim().toLowerCase()) {
      return false;
    }
    if (
      from.includes("mailer-daemon") ||
      from.includes("postmaster@") ||
      from.startsWith("noreply@") ||
      from.startsWith("no-reply@")
    ) {
      return false;
    }
    return true;
  }

  private looksLikeAutoMessage(subject: string): boolean {
    const lower = subject.trim().toLowerCase();
    return (
      lower.startsWith("automatic reply") ||
      lower.startsWith("auto reply") ||
      lower.startsWith("out of office") ||
      lower.startsWith("otomatik yanıt") ||
      lower.includes("automatic reply:")
    );
  }

  private async isOrganizationMailboxAddress(
    organizationId: string,
    fromEmail: string,
  ): Promise<boolean> {
    const mailboxes = await this.mailboxRepository.find({
      where: { organizationId },
    });
    return mailboxes.some(
      (row) => row.emailAddress.trim().toLowerCase() === fromEmail,
    );
  }

  private async isThrottled(
    organizationId: string,
    senderEmail: string,
  ): Promise<boolean> {
    const row = await this.throttleRepository.findOne({
      where: { organizationId, senderEmail },
    });
    if (!row) {
      return false;
    }
    const elapsedMs = Date.now() - row.lastSentAt.getTime();
    return elapsedMs < THROTTLE_HOURS * 60 * 60 * 1000;
  }

  private async recordThrottle(
    organizationId: string,
    senderEmail: string,
  ): Promise<void> {
    const existing = await this.throttleRepository.findOne({
      where: { organizationId, senderEmail },
    });
    const now = new Date();
    if (existing) {
      existing.lastSentAt = now;
      await this.throttleRepository.save(existing);
      return;
    }
    await this.throttleRepository.save(
      this.throttleRepository.create({
        organizationId,
        senderEmail,
        lastSentAt: now,
      }),
    );
  }

  private buildSubject(originalSubject: string): string {
    const trimmed = originalSubject.trim() || "(konu yok)";
    const base = trimmed.toLowerCase().startsWith("re:")
      ? trimmed
      : `Re: ${trimmed}`;
    return base.slice(0, 240);
  }
}

function escapeHtmlMinimal(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
