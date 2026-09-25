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
            ? phaseAProgress >= 100
              ? [
                  "Faz A üretim standardı tamam — PTR/A uyarılarını izleyin",
                  "DMARC raporları (dmarc@lerta.tr) ile teslimat takibi",
                ]
              : [
                  "Platform gönderim: A5 PTR + mail A kaydı (inbox itibarı)",
                  "Checklist tamam → Operasyon test maili",
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
          nextStepsTr: verifiedDomains > 0
            ? [
                "B5 özel domain + B6 denetim sekmesi (Bildirimler)",
                "Pilot firmalarla transactional From testi",
                "Faz C: MX + gelen posta (planlı)",
              ]
            : [
                "Admin → Kurumsal kimlik: DNS doğrula",
                "kullanici.lerta.tr verified sonrası org provision",
              ],
        },
        {
          phase: "C",
          titleTr: "Faz C — Tam posta kutusu",
          summaryTr:
            "Gelen + giden, panel webmail, isteğe bağlı IMAP; harici Gmail/ESP yok.",
          status: inboundMessages > 0 || mailboxes > 0 ? "active" : "planned",
          progressPercent:
            inboundMessages > 0 ? 55 : mailboxes > 0 ? 40 : 20,
          nextStepsTr: [
            "C4: HTML MIME + Dovecot IMAP + Rspamd (docs)",
            "Org: IMAP şifresi rotate + Thunderbird test",
            "Üretim: MAIL_IMAP_MAILDIR_ROOT + setup scriptleri",
          ],
        },
      ],
      checkedAt: new Date().toISOString(),
    };
  }
}
