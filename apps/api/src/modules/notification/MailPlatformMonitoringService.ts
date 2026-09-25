import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { X509Certificate } from "node:crypto";
import { execFile } from "node:child_process";
import { existsSync, readFileSync, statfsSync } from "node:fs";
import { promisify } from "node:util";
import { EmailDeliveryHealthService } from "./EmailDeliveryHealthService";
import { EmailOutboxService } from "./EmailOutboxService";

const execFileAsync = promisify(execFile);

export type MailMonitoringCheckStatus = "ok" | "warning" | "critical" | "unknown";

export type PublicServiceStatus =
  | "operational"
  | "degraded"
  | "major_outage"
  | "maintenance";

export type MailPublicStatusPage = {
  updatedAt: string;
  overall: PublicServiceStatus;
  overallLabelTr: string;
  messageTr: string | null;
  components: {
    id: string;
    nameTr: string;
    status: PublicServiceStatus;
    descriptionTr: string;
  }[];
};

export type MailPlatformMonitoringSnapshot = {
  collectedAt: string;
  overallStatus: MailMonitoringCheckStatus;
  api: { status: "ok"; uptimeSeconds: number };
  outbox: {
    status: MailMonitoringCheckStatus;
    pending: number;
    failed: number;
    sent: number;
    last24hSent: number;
    lastDrainAt: string | null;
    lastDrainError: string | null;
    detailTr: string;
  };
  smtp: {
    status: MailMonitoringCheckStatus;
    lastVerifyOk: boolean | null;
    lastVerifiedAt: string | null;
    lastVerifyError: string | null;
    detailTr: string;
  };
  postfixQueue: {
    status: MailMonitoringCheckStatus;
    messageCount: number | null;
    detailTr: string;
  };
  disk: {
    status: MailMonitoringCheckStatus;
    mounts: {
      path: string;
      usedPercent: number;
      freeGb: number;
    }[];
    detailTr: string;
  };
  tlsCertificates: {
    status: MailMonitoringCheckStatus;
    certs: {
      path: string;
      subject: string;
      expiresAt: string;
      daysRemaining: number;
    }[];
    detailTr: string;
  };
};

@Injectable()
export class MailPlatformMonitoringService {
  private readonly logger = new Logger(MailPlatformMonitoringService.name);
  private readonly startedAt = Date.now();

  public constructor(
    private readonly configService: ConfigService,
    private readonly emailDeliveryHealthService: EmailDeliveryHealthService,
    private readonly emailOutboxService: EmailOutboxService,
  ) {}

  public async buildPublicStatusPage(): Promise<MailPublicStatusPage> {
    const snap = await this.buildSnapshot();
    const maintenance =
      this.configService.get<string>("MAIL_PUBLIC_STATUS_MAINTENANCE") ===
      "true";
    const messageTr =
      this.configService.get<string>("MAIL_PUBLIC_STATUS_MESSAGE")?.trim() ||
      null;

    const outboundInternal = this.worstStatus([
      snap.smtp.status,
      snap.outbox.status,
    ]);
    const inboundInternal = this.worstStatus([
      snap.postfixQueue.status,
      snap.disk.status,
    ]);

    const platformInternal = snap.overallStatus;

    const components = [
      {
        id: "api",
        nameTr: "API ve kimlik doğrulama",
        status: maintenance
          ? "maintenance"
          : this.mapMonitoringToPublic(platformInternal),
        descriptionTr: maintenance
          ? "Planlı bakım"
          : "Giriş ve API uç noktaları",
      },
      {
        id: "webmail",
        nameTr: "Webmail",
        status: maintenance
          ? "maintenance"
          : this.mapMonitoringToPublic(platformInternal),
        descriptionTr: "posta.lerta.com.tr",
      },
      {
        id: "console",
        nameTr: "Yönetim konsolu",
        status: maintenance
          ? "maintenance"
          : this.mapMonitoringToPublic(platformInternal),
        descriptionTr: "Domain, kutu ve ekip yönetimi",
      },
      {
        id: "outbound",
        nameTr: "E-posta gönderimi",
        status: maintenance
          ? "maintenance"
          : this.mapMonitoringToPublic(outboundInternal),
        descriptionTr: snap.outbox.detailTr,
      },
      {
        id: "inbound",
        nameTr: "Gelen posta (MX)",
        status: maintenance
          ? "maintenance"
          : this.mapMonitoringToPublic(inboundInternal),
        descriptionTr: snap.postfixQueue.detailTr,
      },
    ];

    const overall = maintenance
      ? "maintenance"
      : this.worstPublicStatus(components.map((c) => c.status));

    return {
      updatedAt: snap.collectedAt,
      overall,
      overallLabelTr: this.publicStatusLabelTr(overall),
      messageTr,
      components,
    };
  }

  public async buildSnapshot(): Promise<MailPlatformMonitoringSnapshot> {
    const health = this.emailDeliveryHealthService.getSnapshot();
    const outboxStats = await this.emailOutboxService.getOutboxStats();
    const queueWarn = this.readInt("MAIL_MONITOR_QUEUE_WARN", 50);
    const queueCrit = this.readInt("MAIL_MONITOR_QUEUE_CRIT", 200);
    const outboxStatus = this.resolveOutboxStatus(
      outboxStats.pending,
      outboxStats.failed,
      health.outboxOperations.lastDrainError,
      queueWarn,
      queueCrit,
    );

    const smtpStatus: MailMonitoringCheckStatus =
      health.lastVerifyOk === false
        ? "critical"
        : health.lastVerifyOk === true
          ? "ok"
          : "warning";

    const postfixQueue = await this.probePostfixQueue();
    const disk = this.probeDisk();
    const tlsCertificates = this.probeTlsCertificates();

    const overallStatus = this.worstStatus([
      outboxStatus,
      smtpStatus,
      postfixQueue.status,
      disk.status,
      tlsCertificates.status,
    ]);

    return {
      collectedAt: new Date().toISOString(),
      overallStatus,
      api: {
        status: "ok",
        uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      },
      outbox: {
        status: outboxStatus,
        ...outboxStats,
        lastDrainAt: health.outboxOperations.lastDrainAt,
        lastDrainError: health.outboxOperations.lastDrainError,
        detailTr: `Bekleyen ${outboxStats.pending}, başarısız ${outboxStats.failed} (eşik uyarı ${queueWarn} / kritik ${queueCrit})`,
      },
      smtp: {
        status: smtpStatus,
        lastVerifyOk: health.lastVerifyOk,
        lastVerifiedAt: health.lastVerifiedAt,
        lastVerifyError: health.lastVerifyError,
        detailTr:
          health.lastVerifyOk === true
            ? "SMTP doğrulama başarılı"
            : health.lastVerifyError ?? "SMTP henüz doğrulanmadı",
      },
      postfixQueue,
      disk,
      tlsCertificates,
    };
  }

  private async probePostfixQueue(): Promise<
    MailPlatformMonitoringSnapshot["postfixQueue"]
  > {
    const enabled =
      this.configService.get<string>("MAIL_MONITOR_POSTFIX_SHELL") === "true";
    if (!enabled) {
      return {
        status: "unknown",
        messageCount: null,
        detailTr:
          "Postfix kuyruk kontrolü kapalı (MAIL_MONITOR_POSTFIX_SHELL=true ile açın).",
      };
    }
    try {
      const { stdout } = await execFileAsync("mailq", [], {
        timeout: 15_000,
        maxBuffer: 2 * 1024 * 1024,
      });
      if (stdout.includes("Mail queue is empty")) {
        return {
          status: "ok",
          messageCount: 0,
          detailTr: "Postfix kuyruğu boş",
        };
      }
      const messageCount = stdout
        .split("\n")
        .filter((line) => /^[0-9A-F*]/.test(line.trim())).length;
      const warn = this.readInt("MAIL_MONITOR_POSTFIX_WARN", 100);
      const crit = this.readInt("MAIL_MONITOR_POSTFIX_CRIT", 500);
      const status: MailMonitoringCheckStatus =
        messageCount >= crit
          ? "critical"
          : messageCount >= warn
            ? "warning"
            : "ok";
      return {
        status,
        messageCount,
        detailTr: `Postfix kuyruğunda ~${messageCount} mesaj`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`mailq probe failed: ${message}`);
      return {
        status: "warning",
        messageCount: null,
        detailTr: `mailq çalıştırılamadı: ${message}`,
      };
    }
  }

  private probeDisk(): MailPlatformMonitoringSnapshot["disk"] {
    const warnPercent = this.readInt("MAIL_MONITOR_DISK_WARN_PERCENT", 85);
    const critPercent = this.readInt("MAIL_MONITOR_DISK_CRIT_PERCENT", 95);
    const paths = this.resolveDiskPaths();
    const mounts: MailPlatformMonitoringSnapshot["disk"]["mounts"] = [];
    let status: MailMonitoringCheckStatus = "ok";

    for (const path of paths) {
      if (!existsSync(path)) {
        continue;
      }
      try {
        const stat = statfsSync(path);
        const total = stat.blocks * stat.bsize;
        const free = stat.bavail * stat.bsize;
        const usedPercent =
          total > 0 ? Math.round(((total - free) / total) * 100) : 0;
        const freeGb = Math.round((free / 1024 ** 3) * 10) / 10;
        mounts.push({ path, usedPercent, freeGb });
        if (usedPercent >= critPercent) {
          status = "critical";
        } else if (usedPercent >= warnPercent && status !== "critical") {
          status = "warning";
        }
      } catch (error) {
        this.logger.warn(
          `statfs ${path}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    if (mounts.length === 0) {
      return {
        status: "unknown",
        mounts: [],
        detailTr: "Disk yolları okunamadı (VPS dışı ortam?).",
      };
    }

    return {
      status,
      mounts,
      detailTr: mounts
        .map((m) => `${m.path} %${m.usedPercent} dolu`)
        .join(" · "),
    };
  }

  private probeTlsCertificates(): MailPlatformMonitoringSnapshot["tlsCertificates"] {
    const warnDays = this.readInt("MAIL_MONITOR_CERT_WARN_DAYS", 14);
    const critDays = this.readInt("MAIL_MONITOR_CERT_CRIT_DAYS", 3);
    const paths = this.resolveCertPaths();
    const certs: MailPlatformMonitoringSnapshot["tlsCertificates"]["certs"] =
      [];
    let status: MailMonitoringCheckStatus = paths.length > 0 ? "ok" : "unknown";

    for (const path of paths) {
      if (!existsSync(path)) {
        continue;
      }
      try {
        const pem = readFileSync(path, "utf8");
        const cert = new X509Certificate(pem);
        const expiresAt = new Date(cert.validTo);
        const daysRemaining = Math.floor(
          (expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
        );
        certs.push({
          path,
          subject: cert.subject,
          expiresAt: expiresAt.toISOString(),
          daysRemaining,
        });
        if (daysRemaining <= critDays) {
          status = "critical";
        } else if (daysRemaining <= warnDays && status !== "critical") {
          status = "warning";
        }
      } catch (error) {
        this.logger.warn(
          `cert read ${path}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    return {
      status,
      certs,
      detailTr:
        certs.length === 0
          ? "Sertifika yolu tanımlı değil (MAIL_TLS_CERT_PATHS)."
          : certs
              .map((c) => `${c.path}: ${c.daysRemaining} gün`)
              .join(" · "),
    };
  }

  private resolveDiskPaths(): string[] {
    const raw = this.configService.get<string>("MAIL_MONITOR_DISK_PATHS");
    if (raw?.trim()) {
      return raw.split(",").map((p) => p.trim()).filter(Boolean);
    }
    const maildir =
      this.configService.get<string>("MAIL_IMAP_MAILDIR_ROOT")?.trim() ||
      "/var/mail/vhosts";
    const backup =
      this.configService.get<string>("LERTA_MAIL_BACKUP_DIR")?.trim() ||
      "/var/backups/lerta-mail";
    return ["/", maildir, backup];
  }

  private resolveCertPaths(): string[] {
    const raw = this.configService.get<string>("MAIL_TLS_CERT_PATHS");
    if (!raw?.trim()) {
      return [];
    }
    return raw.split(",").map((p) => p.trim()).filter(Boolean);
  }

  private resolveOutboxStatus(
    pending: number,
    failed: number,
    lastDrainError: string | null,
    queueWarn: number,
    queueCrit: number,
  ): MailMonitoringCheckStatus {
    if (lastDrainError && pending > queueWarn) {
      return "critical";
    }
    if (pending >= queueCrit || failed >= queueCrit) {
      return "critical";
    }
    if (pending >= queueWarn || failed >= queueWarn || lastDrainError) {
      return "warning";
    }
    return "ok";
  }

  private worstStatus(
    statuses: MailMonitoringCheckStatus[],
  ): MailMonitoringCheckStatus {
    if (statuses.includes("critical")) {
      return "critical";
    }
    if (statuses.includes("warning")) {
      return "warning";
    }
    if (statuses.every((s) => s === "unknown")) {
      return "unknown";
    }
    return "ok";
  }

  private readInt(key: string, fallback: number): number {
    const raw = this.configService.get<string>(key);
    const parsed = raw ? Number.parseInt(raw, 10) : fallback;
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private mapMonitoringToPublic(
    status: MailMonitoringCheckStatus,
  ): PublicServiceStatus {
    switch (status) {
      case "ok":
        return "operational";
      case "warning":
        return "degraded";
      case "critical":
        return "major_outage";
      default:
        return "operational";
    }
  }

  private worstPublicStatus(statuses: PublicServiceStatus[]): PublicServiceStatus {
    if (statuses.includes("major_outage")) {
      return "major_outage";
    }
    if (statuses.includes("maintenance")) {
      return "maintenance";
    }
    if (statuses.includes("degraded")) {
      return "degraded";
    }
    return "operational";
  }

  private publicStatusLabelTr(status: PublicServiceStatus): string {
    switch (status) {
      case "operational":
        return "Tüm sistemler çalışıyor";
      case "degraded":
        return "Kısmi performans düşüşü";
      case "major_outage":
        return "Kesinti veya ciddi sorun";
      case "maintenance":
        return "Planlı bakım";
    }
  }
}
