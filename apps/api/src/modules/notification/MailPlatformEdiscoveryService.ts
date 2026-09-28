import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailMailboxEntity } from "../../infrastructure/database/entities/MailMailboxEntity";
import { MailInboundMessageEntity } from "../../infrastructure/database/entities/MailInboundMessageEntity";
import { MailMailboxSentEntity } from "../../infrastructure/database/entities/MailMailboxSentEntity";
import { MailOrganizationPrivacyService } from "./MailOrganizationPrivacyService";

export type MailEdiscoveryOrganizationSummary = {
  organizationId: string;
  primaryMailboxAddress: string | null;
  inboundCount: number;
  sentCount: number;
};

@Injectable()
export class MailPlatformEdiscoveryService {
  public constructor(
    private readonly mailOrganizationPrivacyService: MailOrganizationPrivacyService,
    @InjectRepository(MailMailboxEntity)
    private readonly mailboxRepository: Repository<MailMailboxEntity>,
    @InjectRepository(MailInboundMessageEntity)
    private readonly inboundRepository: Repository<MailInboundMessageEntity>,
    @InjectRepository(MailMailboxSentEntity)
    private readonly sentRepository: Repository<MailMailboxSentEntity>,
  ) {}

  public async listOrganizationSummaries(
    limit = 80,
  ): Promise<MailEdiscoveryOrganizationSummary[]> {
    const mailboxes = await this.mailboxRepository.find({
      order: { createdAt: "DESC" },
      take: Math.min(Math.max(limit, 1), 200),
    });
    const orgIds = [...new Set(mailboxes.map((m) => m.organizationId))].slice(
      0,
      limit,
    );
    const summaries: MailEdiscoveryOrganizationSummary[] = [];
    for (const organizationId of orgIds) {
      const orgMailboxes = mailboxes.filter(
        (m) => m.organizationId === organizationId,
      );
      const mailboxIds = orgMailboxes.map((m) => m.id);
      const inboundCount =
        mailboxIds.length > 0
          ? await this.inboundRepository
              .createQueryBuilder("m")
              .where("m.mailboxId IN (:...mailboxIds)", { mailboxIds })
              .getCount()
          : 0;
      const sentCount = await this.sentRepository.count({
        where: { organizationId },
      });
      summaries.push({
        organizationId,
        primaryMailboxAddress: orgMailboxes[0]?.emailAddress ?? null,
        inboundCount,
        sentCount,
      });
    }
    return summaries;
  }

  public async buildExportPackage(organizationId: string) {
    const mailbox = await this.mailboxRepository.findOne({
      where: { organizationId },
    });
    if (!mailbox) {
      throw new NotFoundException("Bu firma için posta kutusu bulunamadı.");
    }
    const exportBody =
      await this.mailOrganizationPrivacyService.buildExport(organizationId);
    return {
      exportedAt: new Date().toISOString(),
      organizationId,
      purposeTr:
        "Platform operatör eDiscovery — yasal uyum / şikayet incelemesi (sınırlı erişim)",
      chainOfCustody: {
        exportVersion: "2026-09-wave2",
        includesInbound: true,
        includesSent: true,
        legalHoldActive: Boolean(mailbox.legalHoldAt),
        legalHoldAt: mailbox.legalHoldAt?.toISOString() ?? null,
        legalHoldRespected: true,
        operatorAttestationTr:
          "Paket platform operatörü tarafından üretildi; müşteri KVKK export ile karıştırılmamalıdır.",
      },
      package: exportBody,
    };
  }
}
