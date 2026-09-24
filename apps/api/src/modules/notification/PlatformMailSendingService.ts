import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { promises as dns } from "node:dns";
import { EmailDeliveryService } from "./EmailDeliveryService";
import { NotificationConfigurationService } from "./NotificationConfigurationService";
import { PostmarkEmailSender } from "./PostmarkEmailSender";

export type PlatformDnsRecordInstruction = {
  type: "TXT" | "CNAME" | "MX";
  host: string;
  value: string;
  purpose: "spf" | "dkim" | "dmarc" | "return_path" | "mx";
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
  deliveryProvider: "smtp" | "postmark";
  postmarkConfigured: boolean;
  postmarkWebhookConfigured: boolean;
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
    private readonly emailDeliveryService: EmailDeliveryService,
    private readonly postmarkEmailSender: PostmarkEmailSender,
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

  public resolveSpfInclude(): string {
    return (
      this.configService.get<string>("MAIL_PLATFORM_SPF_INCLUDE")?.trim() ||
      "spf.mtasv.net"
    );
  }

  public buildDnsInstructions(): PlatformDnsRecordInstruction[] {
    const domain = this.resolvePlatformDomain();
    const spfInclude = this.resolveSpfInclude();
    const dkimHost =
      this.configService.get<string>("POSTMARK_DKIM_HOST")?.trim() ||
      `pm._domainkey.${domain}`;
    const dkimTarget =
      this.configService.get<string>("POSTMARK_DKIM_TARGET")?.trim() ||
      "pm.mtasv.net";
    const returnPath =
      this.configService.get<string>("POSTMARK_RETURN_PATH")?.trim() ||
      `pm-bounces.${domain}`;
    const returnPathTarget =
      this.configService
        .get<string>("POSTMARK_RETURN_PATH_TARGET")
        ?.trim() || "pm.mtasv.net";

    const records: PlatformDnsRecordInstruction[] = [
      {
        type: "TXT",
        host: domain,
        value: `v=spf1 include:${spfInclude} ~all`,
        purpose: "spf",
        notes:
          "Postmark gönderimi için. isimtescil: Alan adı → DNS → TXT kaydı.",
      },
      {
        type: "CNAME",
        host: dkimHost,
        value: dkimTarget,
        purpose: "dkim",
        notes:
          "Postmark panelindeki DKIM değerleriyle birebir eşleşmeli (POSTMARK_DKIM_* env).",
      },
      {
        type: "CNAME",
        host: returnPath,
        value: returnPathTarget,
        purpose: "return_path",
        notes: "Bounce / Return-Path (Postmark önerilen kayıt).",
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
        notes: "Faz C inbound için; Faz A gönderiminde zorunlu değil.",
      });
    }

    return records;
  }

  public async buildSnapshot(): Promise<PlatformSendingSnapshot> {
    const domain = this.resolvePlatformDomain();
    const fromEmail = this.resolveFromEmail();
    const smtpFrom = this.notificationConfigurationService.resolveSmtpConfig().from;
    const postmarkFrom =
      this.configService.get<string>("POSTMARK_FROM")?.trim() || "";
    const configuredFrom = postmarkFrom || smtpFrom;
    const deliveryProvider = this.emailDeliveryService.resolveMode();
    const postmarkConfigured = this.postmarkEmailSender.isConfigured();
    const postmarkWebhookConfigured = Boolean(
      this.configService.get<string>("POSTMARK_WEBHOOK_TOKEN")?.trim(),
    );

    const dnsRecords = this.buildDnsInstructions();
    const checklist = await this.buildChecklist({
      domain,
      fromEmail,
      configuredFrom,
      deliveryProvider,
      postmarkConfigured,
      postmarkWebhookConfigured,
      dnsRecords,
    });

    return {
      phase: "A",
      domain,
      fromEmail,
      configuredFrom,
      deliveryProvider,
      postmarkConfigured,
      postmarkWebhookConfigured,
      registrarHint: "isimtescil.net — lerta.tr / lerta.com.tr DNS yönetimi",
      dnsRecords,
      checklist,
      checkedAt: new Date().toISOString(),
    };
  }

  private async buildChecklist(params: {
    domain: string;
    fromEmail: string;
    configuredFrom: string;
    deliveryProvider: "smtp" | "postmark";
    postmarkConfigured: boolean;
    postmarkWebhookConfigured: boolean;
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
      descriptionTr: `${params.domain} üzerinde gönderim yetkisi (Postmark include).`,
      status: spfOk.ok ? "ok" : "pending",
      detail: spfOk.detail,
    });

    const dkimRecord = params.dnsRecords.find((r) => r.purpose === "dkim");
    const dkimTarget =
      this.configService.get<string>("POSTMARK_DKIM_TARGET")?.trim();
    const dkimOk =
      dkimRecord && dkimTarget
        ? await this.cnameMatches(dkimRecord.host, dkimTarget)
        : {
            ok: false,
            detail:
              "POSTMARK_DKIM_TARGET tanımlı değil — Postmark domain ekranından kopyalayın.",
          };

    items.push({
      id: "A1-dkim",
      titleTr: "A1 — DKIM (CNAME)",
      descriptionTr: "Postmark imza doğrulaması.",
      status: dkimOk.ok ? "ok" : dkimTarget ? "pending" : "warning",
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
      descriptionTr: `Üretim From: ${params.fromEmail} (Gmail relay yerine).`,
      status: fromAligned ? "ok" : "warning",
      detail: fromAligned
        ? `Yapılandırma: ${params.configuredFrom}`
        : `Beklenen: ${params.fromEmail}. SMTP_FROM veya POSTMARK_FROM güncelleyin. Şu an: ${params.configuredFrom}`,
    });

    let espStatus: PlatformSendingCheckItem["status"] = "pending";
    let espDetail = "";
    if (params.deliveryProvider === "postmark") {
      if (params.postmarkConfigured) {
        espStatus = params.postmarkWebhookConfigured ? "ok" : "warning";
        espDetail = params.postmarkWebhookConfigured
          ? "Postmark API token ve webhook token tanımlı."
          : "POSTMARK_SERVER_TOKEN var; POSTMARK_WEBHOOK_TOKEN ekleyin (bounce/şikâyet).";
      } else {
        espStatus = "error";
        espDetail = "EMAIL_DELIVERY_PROVIDER=postmark ancak POSTMARK_SERVER_TOKEN eksik.";
      }
    } else {
      espStatus = "warning";
      espDetail =
        "EMAIL_DELIVERY_PROVIDER=smtp — üretim için postmark + token önerilir.";
    }

    items.push({
      id: "A3-esp",
      titleTr: "A3 — Production ESP",
      descriptionTr: "Postmark gönderim + webhook (admin Politika sekmesinde URL).",
      status: espStatus,
      detail: espDetail,
    });

    const gmailMode =
      this.notificationConfigurationService.resolveDeliveryMode() === "gmail";
    items.push({
      id: "A-gmail-off",
      titleTr: "A — Gmail relay kapatma",
      descriptionTr: "SMTP_PROFILE=gmail üretim gönderiminde kullanılmamalı.",
      status: gmailMode ? "error" : "ok",
      detail: gmailMode
        ? "Hâlâ Gmail SMTP profili aktif. VPS .env: SMTP_PROFILE=custom veya Postmark."
        : "Gmail gönderim profili kapalı (operasyon okuma için Gmail API ayrı kalabilir).",
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
          detail: `${host} TXT var ancak beklenen parça eksik: ${expectedFragment}`,
        };
      }
      return { ok: true, detail: flat.slice(0, 200) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.debug(`TXT lookup ${host}: ${message}`);
      return { ok: false, detail: `DNS sorgusu başarısız: ${message}` };
    }
  }

  private async cnameMatches(
    host: string,
    expectedTarget: string,
  ): Promise<{ ok: boolean; detail: string }> {
    try {
      const targets = await dns.resolveCname(host);
      const normalized = expectedTarget.replace(/\.$/, "").toLowerCase();
      const match = targets.some(
        (t) => t.replace(/\.$/, "").toLowerCase() === normalized,
      );
      if (match) {
        return { ok: true, detail: `${host} → ${targets[0]}` };
      }
      return {
        ok: false,
        detail: `${host} CNAME: ${targets.join(", ")} (beklenen: ${expectedTarget})`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, detail: `CNAME sorgusu: ${message}` };
    }
  }
}

function configuredFromIncludes(configuredFrom: string, email: string): boolean {
  const lower = configuredFrom.toLowerCase();
  return lower.includes(email.toLowerCase());
}
