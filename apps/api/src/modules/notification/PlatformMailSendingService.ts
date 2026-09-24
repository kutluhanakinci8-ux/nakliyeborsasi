import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { promises as dns } from "node:dns";
import { EmailDeliveryHealthService } from "./EmailDeliveryHealthService";
import { NotificationConfigurationService } from "./NotificationConfigurationService";

export type PlatformDnsRecordInstruction = {
  type: "TXT" | "CNAME" | "MX";
  host: string;
  value: string;
  purpose: "spf" | "dkim" | "dmarc" | "mx";
  notes?: string;
};

export type PlatformSendingCheckItem = {
  id: string;
  titleTr: string;
  descriptionTr: string;
  status: "ok" | "warning" | "pending" | "error";
  detail: string | null;
};

export type PlatformSendingSnapshot = {
  phase: "A";
  domain: string;
  fromEmail: string;
  configuredFrom: string;
  deliveryProvider: "smtp";
  smtpHost: string;
  smtpProfile: string;
  registrarHint: string;
  dnsRecords: PlatformDnsRecordInstruction[];
  checklist: PlatformSendingCheckItem[];
  checkedAt: string;
};

@Injectable()
export class PlatformMailSendingService {
  private readonly logger = new Logger(PlatformMailSendingService.name);

  public constructor(
    private readonly configService: ConfigService,
    private readonly notificationConfigurationService: NotificationConfigurationService,
    private readonly emailDeliveryHealthService: EmailDeliveryHealthService,
  ) {}

  public resolvePlatformDomain(): string {
    return (
      this.configService.get<string>("MAIL_PLATFORM_DOMAIN")?.trim() ||
      "mail.lerta.tr"
    );
  }

  public resolveFromLocalPart(): string {
    return (
      this.configService.get<string>("MAIL_PLATFORM_FROM_LOCAL")?.trim() ||
      "notifications"
    );
  }

  public resolveFromEmail(): string {
    const explicit = this.configService
      .get<string>("MAIL_PLATFORM_FROM_EMAIL")
      ?.trim();
    if (explicit) {
      return explicit.toLowerCase();
    }
    const domain = this.resolvePlatformDomain();
    return `${this.resolveFromLocalPart()}@${domain}`.toLowerCase();
  }

  public resolveDmarcHost(): string {
    const override = this.configService.get<string>("MAIL_PLATFORM_DMARC_HOST")?.trim();
    if (override) {
      return override;
    }
    const domain = this.resolvePlatformDomain();
    const parts = domain.split(".");
    const organizational =
      parts.length >= 2 ? parts.slice(-2).join(".") : domain;
    return `_dmarc.${organizational}`;
  }

  public resolveDkimSelector(): string {
    return (
      this.configService.get<string>("MAIL_PLATFORM_DKIM_SELECTOR")?.trim() ||
      "default"
    );
  }

  public resolveDkimHost(): string {
    const override = this.configService.get<string>("MAIL_PLATFORM_DKIM_HOST")?.trim();
    if (override) {
      return override;
    }
    const domain = this.resolvePlatformDomain();
    return `${this.resolveDkimSelector()}._domainkey.${domain}`;
  }

  public buildSpfValue(): string {
    const explicit = this.configService.get<string>("MAIL_PLATFORM_SPF_TXT")?.trim();
    if (explicit) {
      return explicit;
    }
    const ipv4 = this.configService.get<string>("MAIL_PLATFORM_SPF_IPV4")?.trim();
    if (ipv4) {
      return `v=spf1 ip4:${ipv4} -all`;
    }
    const domain = this.resolvePlatformDomain();
    return `v=spf1 a mx -all`;
  }

  public buildDnsInstructions(): PlatformDnsRecordInstruction[] {
    const domain = this.resolvePlatformDomain();
    const spfValue = this.buildSpfValue();
    const dkimHost = this.resolveDkimHost();
    const dkimTxt =
      this.configService.get<string>("MAIL_PLATFORM_DKIM_TXT")?.trim() ||
      "v=DKIM1; k=rsa; p=… (VPS OpenDKIM / Postfix ile üretilen public key)";

    const records: PlatformDnsRecordInstruction[] = [
      {
        type: "TXT",
        host: domain,
        value: spfValue,
        purpose: "spf",
        notes:
          "Gönderim yalnızca sizin VPS MTA (Postfix). MAIL_PLATFORM_SPF_IPV4 veya MAIL_PLATFORM_SPF_TXT ile özelleştirin.",
      },
      {
        type: "TXT",
        host: dkimHost,
        value: dkimTxt,
        purpose: "dkim",
        notes:
          "Kendi sunucunuzda üretilen DKIM public key (TXT). MAIL_PLATFORM_DKIM_TXT ile checklist doğrulanır.",
      },
      {
        type: "TXT",
        host: this.resolveDmarcHost(),
        value: "v=DMARC1; p=none; rua=mailto:dmarc@lerta.tr; pct=100",
        purpose: "dmarc",
        notes:
          "İlk haftalar p=none; teslimat stabil olunca quarantine/reject düşünün.",
      },
    ];

    const mxHost = this.configService.get<string>("MAIL_PLATFORM_MX_HOST")?.trim();
    if (mxHost) {
      records.push({
        type: "MX",
        host: domain,
        value: mxHost,
        purpose: "mx",
        notes: "Faz C inbound için; Faz A giden bildirimde zorunlu değil.",
      });
    }

    return records;
  }

  public async buildSnapshot(): Promise<PlatformSendingSnapshot> {
    const domain = this.resolvePlatformDomain();
    const fromEmail = this.resolveFromEmail();
    const smtp = this.notificationConfigurationService.resolveSmtpConfig();
    const smtpProfile = this.notificationConfigurationService.resolveSmtpProfile();
    const dnsRecords = this.buildDnsInstructions();
    const checklist = await this.buildChecklist({
      domain,
      fromEmail,
      configuredFrom: smtp.from,
      smtpProfile,
      smtpHost: smtp.host,
      dnsRecords,
    });

    return {
      phase: "A",
      domain,
      fromEmail,
      configuredFrom: smtp.from,
      deliveryProvider: "smtp",
      smtpHost: smtp.host,
      smtpProfile,
      registrarHint: "isimtescil.net — lerta.tr DNS (Host Name kayıtları)",
      dnsRecords,
      checklist,
      checkedAt: new Date().toISOString(),
    };
  }

  private async buildChecklist(params: {
    domain: string;
    fromEmail: string;
    configuredFrom: string;
    smtpProfile: string;
    smtpHost: string;
    dnsRecords: PlatformDnsRecordInstruction[];
  }): Promise<PlatformSendingCheckItem[]> {
    const items: PlatformSendingCheckItem[] = [];

    const spfRecord = params.dnsRecords.find((r) => r.purpose === "spf");
    const spfOk = spfRecord
      ? await this.txtContains(spfRecord.host, "v=spf1", spfRecord.value)
      : { ok: false, detail: "SPF talimatı yok" };

    items.push({
      id: "A1-spf",
      titleTr: "A1 — SPF (TXT)",
      descriptionTr: `${params.domain} — yalnızca sizin MTA IP / sunucu.`,
      status: spfOk.ok ? "ok" : "pending",
      detail: spfOk.detail,
    });

    const dkimRecord = params.dnsRecords.find((r) => r.purpose === "dkim");
    const dkimFragment =
      this.configService.get<string>("MAIL_PLATFORM_DKIM_TXT")?.trim() || "v=DKIM1";
    const dkimOk = dkimRecord
      ? await this.txtContains(dkimRecord.host, "v=DKIM1", dkimFragment)
      : { ok: false, detail: "DKIM talimatı yok" };

    items.push({
      id: "A1-dkim",
      titleTr: "A1 — DKIM (TXT)",
      descriptionTr: "Kendi Postfix/OpenDKIM imzanız.",
      status: dkimOk.ok ? "ok" : "pending",
      detail: dkimOk.detail,
    });

    const dmarcRecord = params.dnsRecords.find((r) => r.purpose === "dmarc");
    const dmarcOk = dmarcRecord
      ? await this.txtContains(dmarcRecord.host, "v=DMARC1", "v=DMARC1")
      : { ok: false, detail: "DMARC talimatı yok" };

    items.push({
      id: "A1-dmarc",
      titleTr: "A1 — DMARC (TXT)",
      descriptionTr: "Alan adı politikası ve raporlama.",
      status: dmarcOk.ok ? "ok" : "pending",
      detail: dmarcOk.detail,
    });

    const fromAligned = configuredFromIncludes(
      params.configuredFrom,
      params.fromEmail,
    );
    items.push({
      id: "A2-from",
      titleTr: "A2 — Gönderen adresi",
      descriptionTr: `Üretim From: ${params.fromEmail}.`,
      status: fromAligned ? "ok" : "warning",
      detail: fromAligned
        ? `Yapılandırma: ${params.configuredFrom}`
        : `Beklenen: ${params.fromEmail}. SMTP_FROM güncelleyin. Şu an: ${params.configuredFrom}`,
    });

    const loopbackOwnMta =
      params.smtpProfile === "custom" &&
      (params.smtpHost === "127.0.0.1" || params.smtpHost === "localhost");
    const remoteOwnMta =
      params.smtpProfile === "custom" &&
      params.smtpHost !== "127.0.0.1" &&
      params.smtpHost !== "localhost";
    const ownMtaConfigured = loopbackOwnMta || remoteOwnMta;
    items.push({
      id: "A3-mta",
      titleTr: "A3 — Kendi SMTP (MTA)",
      descriptionTr:
        "Üçüncü taraf ESP yok; gönderim VPS Postfix veya sizin SMTP uç noktanız.",
      status: ownMtaConfigured
        ? "ok"
        : params.smtpProfile === "mailpit"
          ? "warning"
          : "pending",
      detail: loopbackOwnMta
        ? "SMTP_PROFILE=custom, yerel Postfix (127.0.0.1:25) — Faz A üretim."
        : remoteOwnMta
          ? `SMTP_PROFILE=custom, host=${params.smtpHost}`
          : params.smtpProfile === "mailpit"
            ? "Geliştirme Mailpit aktif — üretimde SMTP_PROFILE=custom kullanın."
            : "SMTP_HOST ve SMTP_PROFILE=custom tanımlayın.",
    });

    const health = this.emailDeliveryHealthService.getSnapshot();
    items.push({
      id: "A4-verify",
      titleTr: "A4 — SMTP bağlantı testi",
      descriptionTr: "Admin Operasyon sekmesinden «SMTP doğrula» çalıştırın.",
      status: health.lastVerifyOk === true ? "ok" : health.lastVerifyOk === false ? "error" : "pending",
      detail:
        health.lastVerifyOk === true
          ? `Son doğrulama: ${health.lastVerifiedAt ?? "—"}`
          : health.lastVerifyError ?? "Henüz doğrulanmadı.",
    });

    return items;
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
          detail: `${host} TXT bulunamadı veya ${mustInclude} yok.`,
        };
      }
      if (
        expectedFragment &&
        !flat.toLowerCase().includes(expectedFragment.toLowerCase())
      ) {
        return {
          ok: false,
          detail: `${host} TXT var ancak beklenen parça eksik (env MAIL_PLATFORM_DKIM_TXT / SPF).`,
        };
      }
      return { ok: true, detail: flat.slice(0, 200) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.debug(`TXT lookup ${host}: ${message}`);
      return { ok: false, detail: `DNS sorgusu başarısız: ${message}` };
    }
  }
}

function configuredFromIncludes(configuredFrom: string, email: string): boolean {
  const lower = configuredFrom.toLowerCase();
  return lower.includes(email.toLowerCase());
}
