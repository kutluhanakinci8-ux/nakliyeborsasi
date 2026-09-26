import { BadRequestException, Injectable } from "@nestjs/common";
import { PLATFORM_TENANT_MAIL_DOMAIN } from "@nakliyeborsasi/core";
import {
  CustomDomainBundle,
  MailCustomDomainService,
} from "./MailCustomDomainService";
import { MailSaasSubscriptionService } from "./MailSaasSubscriptionService";
import { MailTenantSubdomainService } from "./MailTenantSubdomainService";

export type ClaimMailAddressResult = {
  fromAddress: string;
  localPart: string;
  domain: string;
  channel: "custom_domain" | "tenant_subdomain";
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
    private readonly mailSaasSubscriptionService: MailSaasSubscriptionService,
    private readonly mailTenantSubdomainService: MailTenantSubdomainService,
  ) {}

  public parseDesiredAddress(raw: string): {
    localPart: string;
    domain: string;
  } {
    const trimmed = raw.trim().toLowerCase();
    const at = trimmed.lastIndexOf("@");
    if (at <= 0 || at === trimmed.length - 1) {
      throw new BadRequestException(
        "Geçerli bir e-posta adresi girin (ör. info@firma.com.tr).",
      );
    }
    const localPart = trimmed.slice(0, at);
    const domain = this.mailCustomDomainService.normalizeDomain(
      trimmed.slice(at + 1),
    );
    const tenantDomain = PLATFORM_TENANT_MAIL_DOMAIN;
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
    const { localPart, domain } = this.parseDesiredAddress(
      params.desiredAddress,
    );
    const tenantDomain = PLATFORM_TENANT_MAIL_DOMAIN;

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
