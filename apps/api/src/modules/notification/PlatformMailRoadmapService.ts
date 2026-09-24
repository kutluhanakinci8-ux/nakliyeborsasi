import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailDomainEntity } from "../../infrastructure/database/entities/MailDomainEntity";
import { MailMailboxEntity } from "../../infrastructure/database/entities/MailMailboxEntity";
import { MailInboundMessageEntity } from "../../infrastructure/database/entities/MailInboundMessageEntity";
import { MailSenderIdentityEntity } from "../../infrastructure/database/entities/MailSenderIdentityEntity";
import { PlatformMailSendingService } from "./PlatformMailSendingService";
import { NotificationConfigurationService } from "./NotificationConfigurationService";

export type MailRoadmapPhaseSnapshot = {
  phase: "A" | "B" | "C";
  titleTr: string;
  summaryTr: string;
  status: "active" | "planned" | "future";
  progressPercent: number;
  nextStepsTr: string[];
};

export type MailRoadmapSnapshot = {
  phases: MailRoadmapPhaseSnapshot[];
  platformSending: Awaited<
    ReturnType<PlatformMailSendingService["buildSnapshot"]>
  >;
  counts: {
    mailDomains: number;
    verifiedDomains: number;
    senderIdentities: number;
    mailboxes: number;
    inboundMessages: number;
  };
  smtpProfile: string;
  checkedAt: string;
};

@Injectable()
export class PlatformMailRoadmapService {
  public constructor(
    private readonly platformMailSendingService: PlatformMailSendingService,
    private readonly notificationConfigurationService: NotificationConfigurationService,
    @InjectRepository(MailDomainEntity)
    private readonly domainRepository: Repository<MailDomainEntity>,
    @InjectRepository(MailMailboxEntity)
    private readonly mailboxRepository: Repository<MailMailboxEntity>,
    @InjectRepository(MailInboundMessageEntity)
    private readonly inboundRepository: Repository<MailInboundMessageEntity>,
    @InjectRepository(MailSenderIdentityEntity)
    private readonly senderRepository: Repository<MailSenderIdentityEntity>,
  ) {}

  public async buildSnapshot(): Promise<MailRoadmapSnapshot> {
    const platformSending =
      await this.platformMailSendingService.buildSnapshot();
    const checklistOk = platformSending.checklist.filter(
      (item) => item.status === "ok",
    ).length;
    const checklistTotal = platformSending.checklist.length;
    const phaseAProgress =
      checklistTotal > 0
        ? Math.round((checklistOk / checklistTotal) * 100)
        : 0;

    const [mailDomains, verifiedDomains, mailboxes, inboundMessages] =
      await Promise.all([
        this.domainRepository.count(),
        this.domainRepository.count({
          where: { verificationStatus: "verified" },
        }),
        this.mailboxRepository.count(),
        this.inboundRepository.count(),
      ]);

    const senderIdentities = await this.senderRepository.count();

    const smtpProfile =
      this.notificationConfigurationService.resolveSmtpProfile();
    const productionSmtp = smtpProfile === "custom";

    const phaseBProgress =
      verifiedDomains > 0 && senderIdentities > 0
        ? Math.min(100, 40 + verifiedDomains * 20 + senderIdentities * 10)
        : mailDomains > 0
          ? 15
          : 0;

    return {
      platformSending,
      smtpProfile,
      counts: {
        mailDomains,
        verifiedDomains,
        senderIdentities,
        mailboxes,
        inboundMessages,
      },
      phases: [
        {
          phase: "A",
          titleTr: "Faz A — Platform bildirimleri",
          summaryTr:
            "Kayıt, ihale, mesaj vb. sistem e-postaları notifications@mail.lerta.tr üzerinden kendi MTA ile.",
          status: phaseAProgress >= 100 && productionSmtp ? "active" : "active",
          progressPercent: phaseAProgress,
          nextStepsTr: productionSmtp
            ? [
                "isimtescil DNS (SPF, DKIM, DMARC) checklist yeşil",
                "Admin Operasyon: test maili gönder",
              ]
            : [
                "VPS: scripts/setup-postfix-phase-a-lerta.sh",
                "scripts/vps-enable-production-smtp.sh",
                "DNS kayıtlarını panel checklist ile doğrula",
              ],
        },
        {
          phase: "B",
          titleTr: "Faz B — Kurumsal gönderen kimliği",
          summaryTr:
            "Organizasyon domain veya alt alan; outbox From doğrulanmış kimlikten (transactional).",
          status: verifiedDomains > 0 ? "active" : "planned",
          progressPercent: phaseBProgress,
          nextStepsTr: [
            "Admin → Kurumsal kimlik: domain ekle",
            "DNS doğrulama sonrası «verified» işaretle",
            "Varsayılan gönderen kimliği tanımla",
          ],
        },
        {
          phase: "C",
          titleTr: "Faz C — Tam posta kutusu",
          summaryTr:
            "Gelen + giden, panel webmail, isteğe bağlı IMAP; harici Gmail/ESP yok.",
          status: "future",
          progressPercent: mailboxes > 0 ? 5 : 0,
          nextStepsTr: [
            "MX → kendi sunucu",
            "Inbound MIME depolama + webmail UI",
            "Bildirim outbox ile mailbox verisi ayrı tutulur",
          ],
        },
      ],
      checkedAt: new Date().toISOString(),
    };
  }
}
