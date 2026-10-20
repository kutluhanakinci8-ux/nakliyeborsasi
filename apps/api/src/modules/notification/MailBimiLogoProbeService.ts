import { Injectable, Logger } from "@nestjs/common";

export type MailBimiLogoProbeResult = {
  logoUrl: string | null;
  reachable: boolean;
  contentType: string | null;
  okForBimi: boolean;
  detailTr: string;
};

@Injectable()
export class MailBimiLogoProbeService {
  private readonly logger = new Logger(MailBimiLogoProbeService.name);

  public async probeLogoUrl(logoUrl: string | null | undefined): Promise<MailBimiLogoProbeResult> {
    const url = logoUrl?.trim() ?? "";
    if (!url) {
      return {
        logoUrl: null,
        reachable: false,
        contentType: null,
        okForBimi: false,
        detailTr: "Kurumsal logo URL tanımlı değil (konsol → Marka).",
      };
    }
    if (!url.startsWith("https://")) {
      return {
        logoUrl: url,
        reachable: false,
        contentType: null,
        okForBimi: false,
        detailTr: "BIMI için logo HTTPS olmalı.",
      };
    }
    try {
      const response = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        signal: AbortSignal.timeout(8000),
      });
      const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() ?? null;
      const okType =
        contentType === "image/svg+xml" ||
        contentType === "image/png" ||
        contentType === "image/jpeg";
      const reachable = response.ok;
      return {
        logoUrl: url,
        reachable,
        contentType,
        okForBimi: reachable && okType,
        detailTr: reachable
          ? okType
            ? "Logo erişilebilir; BIMI TXT kaydına bu URL yazılabilir."
            : `Logo yanıt verdi ancak MIME tipi uygun değil (${contentType ?? "bilinmiyor"}). SVG veya PNG önerilir.`
          : `Logo URL HTTP ${response.status} döndü.`,
      };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.warn(`BIMI logo probe failed: ${detail}`);
      return {
        logoUrl: url,
        reachable: false,
        contentType: null,
        okForBimi: false,
        detailTr: "Logo URL’sine erişilemedi — DNS veya firewall kontrol edin.",
      };
    }
  }
}
