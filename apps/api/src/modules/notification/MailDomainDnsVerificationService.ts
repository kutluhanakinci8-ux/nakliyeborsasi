import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PLATFORM_TENANT_MAIL_DOMAIN } from "@nakliyeborsasi/core";
import * as dns from "node:dns/promises";

@Injectable()
export class MailDomainDnsVerificationService {
  private readonly logger = new Logger(MailDomainDnsVerificationService.name);

  public constructor(private readonly configService: ConfigService) {}

  public resolveTenantMailDomain(): string {
    return (
      this.configService.get<string>("MAIL_PLATFORM_TENANT_DOMAIN")?.trim() ||
      PLATFORM_TENANT_MAIL_DOMAIN
    );
  }

  public async verifyTenantSubdomainDns(): Promise<{
    ok: boolean;
    domain: string;
    spf: { ok: boolean; detail: string };
    dkim: { ok: boolean; detail: string };
  }> {
    const domain = this.resolveTenantMailDomain();
    const spfExpected = this.buildSpfValue();
    const dkimExpected =
      this.configService.get<string>("MAIL_PLATFORM_TENANT_DKIM_TXT")?.trim() ||
      this.configService.get<string>("MAIL_PLATFORM_DKIM_TXT")?.trim() ||
      "";
    const dkimHost = `default._domainkey.${domain}`;

    const spf = await this.txtContains(domain, "v=spf1", spfExpected);
    const dkim = dkimExpected
      ? await this.txtContains(dkimHost, "v=DKIM1", dkimExpected)
      : {
          ok: false,
          detail:
            "MAIL_PLATFORM_TENANT_DKIM_TXT tanımlı değil (kullanici.lerta.tr OpenDKIM).",
        };

    return {
      domain,
      ok: spf.ok && dkim.ok,
      spf,
      dkim,
    };
  }

  private buildSpfValue(): string {
    const explicit = this.configService
      .get<string>("MAIL_PLATFORM_TENANT_SPF_TXT")
      ?.trim();
    if (explicit) {
      return explicit;
    }
    const ipv4 =
      this.configService.get<string>("MAIL_PLATFORM_SPF_IPV4")?.trim() || "";
    if (ipv4) {
      return `v=spf1 ip4:${ipv4} -all`;
    }
    return "v=spf1";
  }

  public async verifyTxtRecord(
    host: string,
    mustInclude: string,
    expectedFragment?: string,
  ): Promise<{ ok: boolean; detail: string }> {
    return this.txtContains(host, mustInclude, expectedFragment);
  }

  public resolvePlatformMxHost(): string {
    return (
      this.configService.get<string>("MAIL_PLATFORM_MX_HOST")?.trim() ||
      "mail.lerta.com.tr"
    );
  }

  public async verifyMxRecord(
    domain: string,
    expectedExchange?: string,
  ): Promise<{ ok: boolean; detail: string }> {
    const target = (expectedExchange ?? this.resolvePlatformMxHost())
      .trim()
      .toLowerCase()
      .replace(/\.$/, "");
    try {
      const records = await dns.resolveMx(domain);
      if (records.length === 0) {
        return { ok: false, detail: `${domain} için MX kaydı yok.` };
      }
      const match = records.some((row) => {
        const host = row.exchange.toLowerCase().replace(/\.$/, "");
        return host === target || host.endsWith(`.${target}`);
      });
      const summary = records
        .map((row) => `${row.priority} ${row.exchange}`)
        .join(", ");
      if (!match) {
        return {
          ok: false,
          detail: `MX: ${summary} (beklenen: ${target})`,
        };
      }
      return { ok: true, detail: summary };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.debug(`MX ${domain}: ${message}`);
      return { ok: false, detail: `DNS MX: ${message}` };
    }
  }

  private async txtContains(
    host: string,
    mustInclude: string,
    expectedFragment?: string,
  ): Promise<{ ok: boolean; detail: string }> {
    try {
      const rows = await dns.resolveTxt(host);
      const flat = rows.map((parts) => parts.join("")).join(" ");
      if (!flat.toLowerCase().includes(mustInclude.toLowerCase())) {
        return {
          ok: false,
          detail: `${host} TXT yok veya ${mustInclude} eksik.`,
        };
      }
      if (
        expectedFragment &&
        !flat.toLowerCase().includes(expectedFragment.toLowerCase())
      ) {
        return {
          ok: false,
          detail: `${host} TXT var; beklenen değer eşleşmiyor.`,
        };
      }
      return { ok: true, detail: flat.slice(0, 160) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.debug(`TXT ${host}: ${message}`);
      return { ok: false, detail: `DNS: ${message}` };
    }
  }
}
