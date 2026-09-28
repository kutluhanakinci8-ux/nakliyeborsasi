import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  buildLertaComTrLocalPartCandidates,
  isValidLertaComTrLocalPart,
  RESERVED_LERTA_COM_TR_LOCAL_PARTS,
} from "@nakliyeborsasi/core";
import { Repository } from "typeorm";
import { MailDomainEntity } from "../../infrastructure/database/entities/MailDomainEntity";
import { MailSenderIdentityEntity } from "../../infrastructure/database/entities/MailSenderIdentityEntity";
import { MailDomainDnsVerificationService } from "./MailDomainDnsVerificationService";

@Injectable()
export class MailLertaComTrOnboardingService {
  public constructor(
    private readonly mailDomainDnsVerificationService: MailDomainDnsVerificationService,
    @InjectRepository(MailDomainEntity)
    private readonly domainRepository: Repository<MailDomainEntity>,
    @InjectRepository(MailSenderIdentityEntity)
    private readonly senderRepository: Repository<MailSenderIdentityEntity>,
  ) {}

  public resolveTenantDomain(): string {
    return this.mailDomainDnsVerificationService.resolveTenantMailDomain();
  }

  public async suggestLocalParts(companyLegalName: string): Promise<{
    tenantDomain: string;
    candidates: { localPart: string; fullAddress: string; available: boolean }[];
    platformDnsReady: boolean;
  }> {
    const tenantDomain = this.resolveTenantDomain();
    const dnsCheck =
      await this.mailDomainDnsVerificationService.verifyTenantSubdomainDns();
    const rawCandidates = buildLertaComTrLocalPartCandidates(
      companyLegalName || "firma",
    );
    const domainRow = await this.domainRepository.findOne({
      where: { domain: tenantDomain },
    });
    const taken = domainRow
      ? await this.loadTakenLocalParts(domainRow.id)
      : new Set<string>();

    const candidates = rawCandidates.map((localPart) => ({
      localPart,
      fullAddress: `${localPart}@${tenantDomain}`,
      available: !taken.has(localPart),
    }));

    return {
      tenantDomain,
      candidates,
      platformDnsReady: dnsCheck.ok,
    };
  }

  public async checkLocalPartAvailability(localPart: string): Promise<{
    tenantDomain: string;
    localPart: string;
    fullAddress: string;
    available: boolean;
    valid: boolean;
    reasonTr: string | null;
  }> {
    const tenantDomain = this.resolveTenantDomain();
    const normalized = localPart.trim().toLowerCase();
    if (!isValidLertaComTrLocalPart(normalized)) {
      return {
        tenantDomain,
        localPart: normalized,
        fullAddress: `${normalized}@${tenantDomain}`,
        available: false,
        valid: false,
        reasonTr: RESERVED_LERTA_COM_TR_LOCAL_PARTS.has(normalized)
          ? "Bu adres ön eki rezerve edilmiştir."
          : "3–50 karakter; küçük harf, rakam ve tire (baş/son tire olamaz).",
      };
    }
    const domainRow = await this.domainRepository.findOne({
      where: { domain: tenantDomain },
    });
    if (!domainRow) {
      return {
        tenantDomain,
        localPart: normalized,
        fullAddress: `${normalized}@${tenantDomain}`,
        available: true,
        valid: true,
        reasonTr: null,
      };
    }
    const taken = await this.senderRepository.findOne({
      where: { mailDomainId: domainRow.id, localPart: normalized },
    });
    return {
      tenantDomain,
      localPart: normalized,
      fullAddress: `${normalized}@${tenantDomain}`,
      available: !taken,
      valid: true,
      reasonTr: taken ? "Bu adres başka bir firmada kullanılıyor." : null,
    };
  }

  private async loadTakenLocalParts(
    mailDomainId: string,
  ): Promise<Set<string>> {
    const rows = await this.senderRepository.find({
      where: { mailDomainId },
      select: { localPart: true },
    });
    return new Set(rows.map((r) => r.localPart.toLowerCase()));
  }
}
