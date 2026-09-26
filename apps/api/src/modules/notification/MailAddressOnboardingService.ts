import { BadRequestException, Injectable } from "@nestjs/common";
import { parseInstantBoxVanityEmail } from "@nakliyeborsasi/core";
import {
  CustomDomainBundle,
  MailCustomDomainService,
} from "./MailCustomDomainService";
import { MailInstantBoxDomainService } from "./MailInstantBoxDomainService";
import { MailSaasSubscriptionService } from "./MailSaasSubscriptionService";
import { MailTenantSubdomainService } from "./MailTenantSubdomainService";
import { MailDomainDnsVerificationService } from "./MailDomainDnsVerificationService";

export type ClaimMailAddressResult = {
  fromAddress: string;
  /** Müşteriye gösterilen kısa adres (ör. info@abayer.box) */
  vanityAddress: string | null;
  localPart: string;
  domain: string;
  channel: "custom_domain" | "tenant_subdomain" | "instant_box";
  mailboxProvisioned: boolean;
  /** MX+SPF+DKIM public DNS — gerekli teslimat için */
  publicDnsReady: boolean;
  bundle: CustomDomainBundle | null;
  nextStepTr: string;
};

@Injectable()
export class MailAddressOnboardingService {
  public constructor(
    private readonly mailCustomDomainService: MailCustomDomainService,
    private readonly mailInstantBoxDomainService: MailInstantBoxDomainService,
    private readonly mailSaasSubscriptionService: MailSaasSubscriptionService,
    private readonly mailTenantSubdomainService: MailTenantSubdomainService,
    private readonly mailDomainDnsVerificationService: MailDomainDnsVerificationService,
  ) {}

  public parseDesiredAddress(raw: string): {
    localPart: string;
    domain: string;
    instantBoxOrgSlug?: string;
  } {
    const instant = parseInstantBoxVanityEmail(raw);
    if (instant) {
      return {
        localPart: instant.localPart,
        domain: instant.fqdn,
        instantBoxOrgSlug: instant.orgSlug,
      };
    }
    const trimmed = raw.trim().toLowerCase();
    const at = trimmed.lastIndexOf("@");
    if (at <= 0 || at === trimmed.length - 1) {
      throw new BadRequestException(
        "Geçerli bir e-posta adresi girin (ör. info@firma.com.tr veya info@firma.box).",
      );
    }
    const localPart = trimmed.slice(0, at);
    const domain = this.mailCustomDomainService.normalizeDomain(
      trimmed.slice(at + 1),
    );
    const tenantDomain =
      this.mailDomainDnsVerificationService.resolveTenantMailDomain();
    if (domain === tenantDomain) {
      if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(localPart)) {
        throw new BadRequestException(
          "Pilot adresi için ön ek: küçük harf, rakam ve tire (ör. acme-lojistik).",
        );
      }
    } else {
      if (!/^[a-z0-9][a-z0-9._-]{1,48}[a-z0-9]$/.test(localPart)) {
        throw new BadRequestException(
          "Geçersiz adres ön eki; küçük harf, rakam, nokta, tire ve alt çizgi kullanın.",
        );
      }
      this.mailCustomDomainService.assertValidCustomDomain(domain);
    }
    return { localPart, domain };
  }

  public async claimDesiredAddress(params: {
    organizationId: string;
    desiredAddress: string;
    displayName?: string;
  }): Promise<ClaimMailAddressResult> {
    const parsed = this.parseDesiredAddress(params.desiredAddress);
    const { localPart, domain } = parsed;
    const tenantDomain =
      this.mailDomainDnsVerificationService.resolveTenantMailDomain();

    if (parsed.instantBoxOrgSlug) {
      const box = await this.mailInstantBoxDomainService.provisionSender({
        organizationId: params.organizationId,
        orgSlug: parsed.instantBoxOrgSlug,
        localPart,
        displayName: params.displayName,
        makeDefault: true,
      });
      const publicDnsReady =
        await this.mailInstantBoxDomainService.platformInstantBoxDnsReady();
      return {
        fromAddress: box.fromAddress,
        vanityAddress: box.vanityAddress,
        localPart,
        domain: box.mailDomain.domain,
        channel: "instant_box",
        mailboxProvisioned: true,
        publicDnsReady,
        bundle: null,
        nextStepTr: publicDnsReady
          ? `${box.vanityAddress} hazır — DNS Lerta tarafında; webmail kullanabilirsiniz.`
          : `${box.vanityAddress} kutusu oluşturuldu; platform box DNS (wildcard) henüz doğrulanmadı.`,
      };
    }

    if (domain === tenantDomain) {
      const result = await this.mailTenantSubdomainService.provisionPilotSender({
        organizationId: params.organizationId,
        localPart,
        displayName: params.displayName,
        makeDefault: true,
      });
      const identity =
        await this.mailTenantSubdomainService.getOrganizationMailIdentity(
          params.organizationId,
        );
      return {
        fromAddress: result.fromAddress,
        vanityAddress: null,
        localPart,
        domain: tenantDomain,
        channel: "tenant_subdomain",
        mailboxProvisioned: true,
        publicDnsReady: identity.dnsCheck.ok,
        bundle: null,
        nextStepTr: identity.dnsCheck.ok
          ? "Webmail ile giriş yapıp posta gönderebilirsiniz."
          : "Platform DNS hazırlanıyor; birkaç dakika sonra tekrar deneyin.",
      };
    }

    await this.mailSaasSubscriptionService.assertCustomDomainAllowed(
      params.organizationId,
    );

    const existingBundle =
      await this.mailCustomDomainService.getOrganizationBundle(
        params.organizationId,
      );
    if (
      existingBundle.mailDomain &&
      existingBundle.mailDomain.domain !== domain
    ) {
      throw new BadRequestException(
        `Bu firma için kayıtlı alan adı ${existingBundle.mailDomain.domain}. Yeni adres aynı alan adında olmalı.`,
      );
    }

    if (!existingBundle.mailDomain) {
      await this.mailCustomDomainService.registerForOrganization(
        params.organizationId,
        domain,
      );
    }

    await this.mailCustomDomainService.provisionSender({
      organizationId: params.organizationId,
      localPart,
      displayName: params.displayName,
      makeDefault: true,
      allowUnverifiedDomain: true,
    });

    const bundle = await this.mailCustomDomainService.getOrganizationBundle(
      params.organizationId,
    );
    const publicDnsReady = bundle.dnsCheck?.ok === true;

    return {
      fromAddress: `${localPart}@${domain}`,
      vanityAddress: null,
      localPart,
      domain,
      channel: "custom_domain",
      mailboxProvisioned: true,
      publicDnsReady,
      bundle,
      nextStepTr: publicDnsReady
        ? "DNS doğrulandı; webmail üzerinden gönderim ve alım hazır."
        : "Kutu hazır. Alan adınıza MX, SPF ve DKIM kayıtlarını ekleyip «DNS doğrula» ile teslimatı açın.",
    };
  }
}
