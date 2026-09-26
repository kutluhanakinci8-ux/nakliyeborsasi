import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MailInboundRoutingService } from "./MailInboundRoutingService";
import {
  MailDomainEntity,
  MailDomainType,
} from "../../infrastructure/database/entities/MailDomainEntity";
import { MailSenderIdentityEntity } from "../../infrastructure/database/entities/MailSenderIdentityEntity";
import { MailMailboxEntity } from "../../infrastructure/database/entities/MailMailboxEntity";

@Injectable()
export class MailDomainApplicationService {
  private readonly logger = new Logger(MailDomainApplicationService.name);

  public constructor(
    @InjectRepository(MailDomainEntity)
    private readonly domainRepository: Repository<MailDomainEntity>,
    @InjectRepository(MailSenderIdentityEntity)
    private readonly senderRepository: Repository<MailSenderIdentityEntity>,
    @InjectRepository(MailMailboxEntity)
    private readonly mailboxRepository: Repository<MailMailboxEntity>,
    private readonly mailInboundRoutingService: MailInboundRoutingService,
  ) {}

  public async listDomains(): Promise<MailDomainEntity[]> {
    return this.domainRepository.find({
      order: { createdAt: "DESC" },
      relations: { senderIdentities: true },
    });
  }

  public async createDomain(params: {
    organizationId: string | null;
    domain: string;
    domainType: MailDomainType;
    notes?: string;
  }): Promise<MailDomainEntity> {
    const normalized = params.domain.trim().toLowerCase();
    const row = await this.domainRepository.save(
      this.domainRepository.create({
        organizationId: params.organizationId,
        domain: normalized,
        domainType: params.domainType,
        verificationStatus: "pending",
        notes: params.notes ?? null,
        dnsSnapshot: {
          spfHint: `v=spf1 ip4:<VPS_IP> -all`,
          dkimHint: `TXT default._domainkey.${normalized}`,
          dmarcHint: `_dmarc.${normalized.split(".").slice(-2).join(".")}`,
        },
      }),
    );
    return row;
  }

  public async markVerified(domainId: string): Promise<MailDomainEntity> {
    const row = await this.domainRepository.findOne({ where: { id: domainId } });
    if (!row) {
      throw new NotFoundException("Mail domain not found");
    }
    row.verificationStatus = "verified";
    return this.domainRepository.save(row);
  }

  public async addSenderIdentity(params: {
    mailDomainId: string;
    organizationId: string;
    localPart: string;
    displayName?: string;
    isDefault?: boolean;
  }): Promise<MailSenderIdentityEntity> {
    const domain = await this.domainRepository.findOne({
      where: { id: params.mailDomainId },
    });
    if (!domain) {
      throw new NotFoundException("Mail domain not found");
    }
    if (params.isDefault) {
      await this.senderRepository.update(
        { organizationId: params.organizationId, isDefault: true },
        { isDefault: false },
      );
    }
    const sender = await this.senderRepository.save(
      this.senderRepository.create({
        mailDomainId: params.mailDomainId,
        organizationId: params.organizationId,
        localPart: params.localPart.trim().toLowerCase(),
        displayName: params.displayName?.trim() ?? null,
        purpose: "transactional",
        isDefault: params.isDefault ?? false,
      }),
    );
    const fromEmail =
      `${sender.localPart}@${domain.domain}`.toLowerCase();
    await this.ensureMailbox(params.organizationId, fromEmail);

    void this.mailInboundRoutingService
      .writePostfixVirtualMap()
      .then((result) => {
        if (result.written) {
          this.logger.log(
            `Postfix virtual map güncellendi (${result.entryCount} giriş).`,
          );
        }
      })
      .catch((error) => {
        this.logger.warn(
          `Postfix virtual map sync: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    return sender;
  }

  private async ensureMailbox(
    organizationId: string,
    emailAddress: string,
  ): Promise<void> {
    const existing = await this.mailboxRepository.findOne({
      where: { organizationId, emailAddress },
    });
    if (existing) {
      return;
    }
    await this.mailboxRepository.save(
      this.mailboxRepository.create({
        organizationId,
        emailAddress,
        status: "active",
        quotaBytes: "0",
      }),
    );
  }
}
