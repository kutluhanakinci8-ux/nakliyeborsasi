import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { createHash, randomBytes } from "crypto";
import { In, Repository } from "typeorm";
import { MailDomainEntity } from "../../infrastructure/database/entities/MailDomainEntity";
import { MailSenderIdentityEntity } from "../../infrastructure/database/entities/MailSenderIdentityEntity";
import { MailMailboxEntity } from "../../infrastructure/database/entities/MailMailboxEntity";
import { MailMailboxSentEntity } from "../../infrastructure/database/entities/MailMailboxSentEntity";
import { MailInboundMessageEntity } from "../../infrastructure/database/entities/MailInboundMessageEntity";
import { MailComposeDraftEntity } from "../../infrastructure/database/entities/MailComposeDraftEntity";
import { MailComposePresetEntity } from "../../infrastructure/database/entities/MailComposePresetEntity";
import { MailDmarcAggregateReportEntity } from "../../infrastructure/database/entities/MailDmarcAggregateReportEntity";
import { MailImapCredentialEntity } from "../../infrastructure/database/entities/MailImapCredentialEntity";
import { EmailOrganizationSuppressionEntity } from "../../infrastructure/database/entities/EmailOrganizationSuppressionEntity";
import { CompanyMailTeamInviteEntity } from "../../infrastructure/database/entities/CompanyMailTeamInviteEntity";
import { MailOrganizationDeletionRequestEntity } from "../../infrastructure/database/entities/MailOrganizationDeletionRequestEntity";
import { MailOrganizationOperatorStateEntity } from "../../infrastructure/database/entities/MailOrganizationOperatorStateEntity";
import { AuditLogEntity } from "../../infrastructure/database/entities/AuditLogEntity";
import { MailSaasSubscriptionService } from "./MailSaasSubscriptionService";
import { MailOrganizationStorageService } from "./MailOrganizationStorageService";

const CONFIRM_PHRASE = "LERTA-MAIL-SIL";

@Injectable()
export class MailOrganizationPrivacyService {
  public constructor(
    private readonly configService: ConfigService,
    private readonly mailSaasSubscriptionService: MailSaasSubscriptionService,
    private readonly mailOrganizationStorageService: MailOrganizationStorageService,
    @InjectRepository(MailDomainEntity)
    private readonly domainRepository: Repository<MailDomainEntity>,
    @InjectRepository(MailSenderIdentityEntity)
    private readonly senderRepository: Repository<MailSenderIdentityEntity>,
    @InjectRepository(MailMailboxEntity)
    private readonly mailboxRepository: Repository<MailMailboxEntity>,
    @InjectRepository(MailMailboxSentEntity)
    private readonly sentRepository: Repository<MailMailboxSentEntity>,
    @InjectRepository(MailInboundMessageEntity)
    private readonly inboundRepository: Repository<MailInboundMessageEntity>,
    @InjectRepository(MailComposeDraftEntity)
    private readonly draftRepository: Repository<MailComposeDraftEntity>,
    @InjectRepository(MailComposePresetEntity)
    private readonly presetRepository: Repository<MailComposePresetEntity>,
    @InjectRepository(MailDmarcAggregateReportEntity)
    private readonly dmarcRepository: Repository<MailDmarcAggregateReportEntity>,
    @InjectRepository(MailImapCredentialEntity)
    private readonly imapRepository: Repository<MailImapCredentialEntity>,
    @InjectRepository(EmailOrganizationSuppressionEntity)
    private readonly suppressionRepository: Repository<EmailOrganizationSuppressionEntity>,
    @InjectRepository(CompanyMailTeamInviteEntity)
    private readonly inviteRepository: Repository<CompanyMailTeamInviteEntity>,
    @InjectRepository(MailOrganizationDeletionRequestEntity)
    private readonly deletionRequestRepository: Repository<MailOrganizationDeletionRequestEntity>,
    @InjectRepository(MailOrganizationOperatorStateEntity)
    private readonly operatorStateRepository: Repository<MailOrganizationOperatorStateEntity>,
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepository: Repository<AuditLogEntity>,
  ) {}

  public async buildExport(organizationId: string) {
    const subscription =
      await this.mailSaasSubscriptionService.getOrganizationMailPlan(
        organizationId,
      );
    const storage =
      await this.mailOrganizationStorageService.getSnapshot(organizationId);

    const domains = await this.domainRepository.find({
      where: { organizationId },
    });
    const senders = await this.mailSaasSubscriptionService.listOrganizationSenders(
      organizationId,
    );
    const mailboxes = await this.mailboxRepository.find({
      where: { organizationId },
    });
    const suppressions = await this.suppressionRepository.find({
      where: { organizationId },
    });
    const sent = await this.sentRepository.find({
      where: { organizationId },
      order: { sentAt: "DESC" },
      take: 500,
    });
    const mailboxIds = mailboxes.map((m) => m.id);
    const inbound =
      mailboxIds.length > 0
        ? await this.inboundRepository.find({
            where: { mailboxId: In(mailboxIds) },
            order: { receivedAt: "DESC" },
            take: 300,
            select: [
              "id",
              "fromAddress",
              "subject",
              "receivedAt",
              "readAt",
              "mailboxFolder",
              "spamStatus",
            ],
          })
        : [];
    const presets = await this.presetRepository.find({
      where: { organizationId },
    });
    const drafts = await this.draftRepository.find({
      where: { organizationId },
      take: 100,
    });
    const invites = await this.inviteRepository.find({
      where: { companyId: organizationId },
    });
    const audit = await this.auditLogRepository.find({
      where: { actorCompanyId: organizationId },
      order: { createdAt: "DESC" },
      take: 200,
    });

    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      organizationId,
      subscription,
      storageQuota: storage,
      domains: domains.map((row) => ({
        id: row.id,
        domain: row.domain,
        domainType: row.domainType,
        verificationStatus: row.verificationStatus,
        createdAt: row.createdAt.toISOString(),
        dnsSnapshot: this.redactDnsSnapshot(row.dnsSnapshot),
      })),
      senders,
      mailboxes: mailboxes.map((m) => ({
        id: m.id,
        emailAddress: m.emailAddress,
        status: m.status,
      })),
      suppressions: suppressions.map((s) => ({
        emailAddress: s.emailAddress,
        reason: s.reason,
        source: s.source,
        updatedAt: s.updatedAt.toISOString(),
      })),
      sentMessages: sent.map((s) => ({
        id: s.id,
        toAddress: s.toAddress,
        subject: s.subject,
        sentAt: s.sentAt.toISOString(),
        bodyPreview: s.bodyText?.slice(0, 500) ?? null,
      })),
      inboundMessages: inbound.map((m) => ({
        id: m.id,
        fromAddress: m.fromAddress,
        subject: m.subject,
        receivedAt: m.receivedAt.toISOString(),
        mailboxFolder: m.mailboxFolder,
      })),
      composePresets: presets.map((p) => ({
        id: p.id,
        kind: p.kind,
        name: p.name,
        updatedAt: p.updatedAt.toISOString(),
      })),
      draftCount: drafts.length,
      teamInvites: invites.map((i) => ({
        id: i.id,
        email: i.email,
        roleCode: i.roleCode,
        acceptedAt: i.acceptedAt?.toISOString() ?? null,
        revokedAt: i.revokedAt?.toISOString() ?? null,
        expiresAt: i.expiresAt.toISOString(),
      })),
      auditLog: audit.map((row) => ({
        id: row.id,
        actionCode: row.actionCode,
        actorUserId: row.actorUserId,
        createdAt: row.createdAt.toISOString(),
        metadata: row.metadata,
      })),
    };
  }

  public async getDeletionStatus(organizationId: string) {
    const latest = await this.deletionRequestRepository.findOne({
      where: { organizationId },
      order: { createdAt: "DESC" },
    });
    if (!latest) {
      return { hasRequest: false };
    }
    return {
      hasRequest: true,
      request: {
        id: latest.id,
        status: latest.status,
        reason: latest.reason,
        executeAfter: latest.executeAfter.toISOString(),
        completedAt: latest.completedAt?.toISOString() ?? null,
        createdAt: latest.createdAt.toISOString(),
      },
    };
  }

  public async createDeletionRequest(params: {
    organizationId: string;
    userId: string;
    confirmPhrase: string;
    reason?: string;
  }): Promise<{
    requestId: string;
    confirmToken: string;
    executeAfter: string;
  }> {
    if (params.confirmPhrase.trim() !== CONFIRM_PHRASE) {
      throw new BadRequestException(
        `Onay metni tam olarak "${CONFIRM_PHRASE}" olmalı.`,
      );
    }
    const pending = await this.deletionRequestRepository.findOne({
      where: { organizationId: params.organizationId, status: "pending" },
    });
    if (pending) {
      throw new BadRequestException("Bekleyen bir silme talebi zaten var.");
    }

    const coolingHours = this.resolveCoolingHours();
    const executeAfter = new Date(Date.now() + coolingHours * 60 * 60 * 1000);
    const confirmToken = randomBytes(24).toString("base64url");
    const confirmTokenHash = createHash("sha256")
      .update(confirmToken)
      .digest("hex");
    const row = await this.deletionRequestRepository.save(
      this.deletionRequestRepository.create({
        organizationId: params.organizationId,
        requestedByUserId: params.userId,
        status: "pending",
        reason: params.reason?.trim() || null,
        executeAfter,
        confirmTokenHash,
        completedAt: null,
      }),
    );
    return {
      requestId: row.id,
      confirmToken,
      executeAfter: executeAfter.toISOString(),
    };
  }

  public async confirmDeletionRequest(params: {
    organizationId: string;
    requestId: string;
    confirmToken: string;
  }): Promise<{ ok: true; completedAt: string }> {
    const row = await this.deletionRequestRepository.findOne({
      where: {
        id: params.requestId,
        organizationId: params.organizationId,
      },
    });
    if (!row || row.status !== "pending") {
      throw new NotFoundException("Silme talebi bulunamadı.");
    }
    const tokenHash = createHash("sha256")
      .update(params.confirmToken)
      .digest("hex");
    if (tokenHash !== row.confirmTokenHash) {
      throw new ForbiddenException("Geçersiz onay kodu.");
    }
    const immediate =
      this.configService.get<string>("MAIL_KVKK_IMMEDIATE_ERASE") === "true";
    if (!immediate && row.executeAfter.getTime() > Date.now()) {
      throw new BadRequestException(
        `Bekleme süresi dolmadı. En erken: ${row.executeAfter.toISOString()}`,
      );
    }
    await this.executeErasure(params.organizationId);
    row.status = "completed";
    row.completedAt = new Date();
    await this.deletionRequestRepository.save(row);
    return { ok: true, completedAt: row.completedAt.toISOString() };
  }

  public async cancelDeletionRequest(
    organizationId: string,
    requestId: string,
  ): Promise<void> {
    const row = await this.deletionRequestRepository.findOne({
      where: { id: requestId, organizationId, status: "pending" },
    });
    if (!row) {
      throw new NotFoundException("Aktif talep bulunamadı.");
    }
    row.status = "cancelled";
    await this.deletionRequestRepository.save(row);
  }

  private async executeErasure(organizationId: string): Promise<void> {
    const mailboxes = await this.mailboxRepository.find({
      where: { organizationId },
    });
    const mailboxIds = mailboxes.map((m) => m.id);
    if (mailboxIds.length > 0) {
      await this.inboundRepository.delete({ mailboxId: In(mailboxIds) });
    }
    await this.sentRepository.delete({ organizationId });
    await this.draftRepository.delete({ organizationId });
    await this.presetRepository.delete({ organizationId });
    await this.dmarcRepository.delete({ organizationId });
    await this.imapRepository.delete({ organizationId });
    await this.suppressionRepository.delete({ organizationId });
    await this.inviteRepository.delete({ companyId: organizationId });

    for (const domain of await this.domainRepository.find({
      where: { organizationId },
    })) {
      domain.dnsSnapshot = this.redactDnsSnapshot(domain.dnsSnapshot);
      domain.notes = "KVKK silme — DNS snapshot scrubbed";
      await this.domainRepository.save(domain);
    }

    for (const mailbox of mailboxes) {
      mailbox.status = "suspended";
      await this.mailboxRepository.save(mailbox);
    }

    const operator = await this.operatorStateRepository.findOne({
      where: { organizationId },
    });
    if (operator) {
      operator.suspended = true;
      operator.suspendReason =
        "KVKK veri silme talebi tamamlandı — gönderim kapalı";
      operator.suspendedAt = new Date();
      await this.operatorStateRepository.save(operator);
    }
  }

  private redactDnsSnapshot(
    snapshot: Record<string, unknown> | null,
  ): Record<string, unknown> | null {
    if (!snapshot) {
      return null;
    }
    const copy = { ...snapshot };
    delete copy.dkimPrivateKeyPem;
    return copy;
  }

  private resolveCoolingHours(): number {
    const raw = this.configService.get<string>("MAIL_KVKK_COOLING_HOURS");
    const parsed = raw ? Number.parseInt(raw, 10) : 24;
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 24;
    }
    return Math.min(parsed, 168);
  }

}
