import { Injectable } from "@nestjs/common";
import { lookup } from "node:dns/promises";
import { ValidationException } from "@nakliyeborsasi/core";
import { CompanyWebsiteEnrichmentResult } from "./CompanyWebsiteEnrichmentResult";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_HTML_BYTES = 750_000;

@Injectable()
export class CompanyWebsiteEnrichmentService {
  public async enrichFromWebsite(
    rawUrl: string,
  ): Promise<CompanyWebsiteEnrichmentResult> {
    const sourceUrl = this.normalizePublicUrl(rawUrl);
    await this.assertPublicHost(sourceUrl);

    const html = await this.fetchHtml(sourceUrl);
    const text = this.htmlToVisibleText(html);
    const host = new URL(sourceUrl).hostname.replace(/^www\./i, "");

    const title = this.extractTitle(html);
    const ogSiteName = this.extractMetaContent(html, "og:site_name");
    const companyLegalName =
      this.pickCompanyName(ogSiteName, title, text, html) ?? null;

    const emails = this.extractEmails(html, text, host);
    const phones = this.extractPhones(html, text);
    const mersis = this.extractMersis(text);
    const addressLine = this.extractAddress(text);
    const city = this.extractCity(text, addressLine);
    const servicesSummary = this.extractServicesSummary(text);

    return {
      sourceUrl,
      companyLegalName,
      tradeName: companyLegalName,
      emailAddress: emails[0] ?? null,
      phone: phones[0] ?? null,
      taxOrRegistryId: mersis,
      addressLine,
      city,
      servicesSummary,
    };
  }

  private normalizePublicUrl(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) {
      throw new ValidationException("Web adresi gerekli");
    }
    const withScheme = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    let parsed: URL;
    try {
      parsed = new URL(withScheme);
    } catch {
      throw new ValidationException("Geçersiz web adresi");
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new ValidationException("Yalnızca http ve https desteklenir");
    }
    if (!parsed.hostname) {
      throw new ValidationException("Geçersiz web adresi");
    }
    parsed.hash = "";
    return parsed.toString();
  }

  private async assertPublicHost(url: string): Promise<void> {
    const hostname = new URL(url).hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      throw new ValidationException("Bu adres türü desteklenmiyor");
    }

    const resolved = await lookup(hostname, { verbatim: true });
    const ip = resolved.address;
    if (this.isPrivateOrReservedIp(ip)) {
      throw new ValidationException("Yalnızca genel internet adresleri desteklenir");
    }
  }

  private isPrivateOrReservedIp(ip: string): boolean {
    if (ip.includes(":")) {
      const lower = ip.toLowerCase();
      return (
        lower === "::1" ||
        lower.startsWith("fc") ||
        lower.startsWith("fd") ||
        lower.startsWith("fe80")
      );
    }
    const parts = ip.split(".").map((p) => Number(p));
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
      return true;
    }
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }

  private async fetchHtml(url: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent":
            "NakliyeBorsasi-CompanyEnrichment/1.0 (+https://nakliyeborsasi.local)",
        },
      });
      if (!response.ok) {
        throw new ValidationException("Web sayfası okunamadı");
      }
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > MAX_HTML_BYTES) {
        throw new ValidationException("Web sayfası çok büyük");
      }
      const charset =
        response.headers.get("content-type")?.match(/charset=([^;]+)/i)?.[1] ??
        "utf-8";
      return new TextDecoder(charset).decode(buffer);
    } catch (error) {
      if (error instanceof ValidationException) {
        throw error;
      }
      throw new ValidationException("Web sayfasına bağlanılamadı");
    } finally {
      clearTimeout(timer);
    }
  }

  private htmlToVisibleText(html: string): string {
    const withoutScripts = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ");
    const text = withoutScripts
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .replace(/\s+/g, " ")
      .trim();
    return text;
  }

  private extractTitle(html: string): string | null {
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (!match) {
      return null;
    }
    return this.cleanLabel(match[1]);
  }

  private extractMetaContent(html: string, property: string): string | null {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i",
    );
    const match = html.match(re);
    if (match) {
      return this.cleanLabel(match[1]);
    }
    const reReverse = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
      "i",
    );
    const reverse = html.match(reReverse);
    return reverse ? this.cleanLabel(reverse[1]) : null;
  }

  private pickCompanyName(
    ogSiteName: string | null,
    title: string | null,
    text: string,
    html: string,
  ): string | null {
    const legalHaystack = `${html}\n${text}`;
    const legalMatch = legalHaystack.match(
      /(Bnk\s+Depolama\s+Lojistik\s+AŞ|Depolama\s+Lojistik\s+AŞ|[A-ZÇĞİÖŞÜ][\wçğıöşüÇĞİÖŞÜ&.\s]{2,90}(?:A\.?Ş\.?|Ltd\.?\s*Şti\.?|Lojistik\s+AŞ|Logistics))/i,
    );
    if (legalMatch) {
      return legalMatch[1].replace(/\s+/g, " ").trim();
    }
    const headingMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (headingMatch) {
      const heading = this.cleanLabel(headingMatch[1]);
      if (heading.length >= 3 && heading.length <= 120) {
        return heading;
      }
    }
    const candidates = [ogSiteName, title].filter(Boolean) as string[];
    for (const candidate of candidates) {
      const cleaned = candidate
        .split("|")[0]
        .split("–")[0]
        .split("-")[0]
        .trim();
      if (cleaned.length >= 3 && cleaned.length <= 120) {
        return cleaned;
      }
    }
    return null;
  }

  private extractEmails(html: string, text: string, host: string): string[] {
    const haystack = `${html}\n${text}`;
    const matches = haystack.match(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    );
    if (!matches) {
      return [];
    }
    const hostRoot = host.split(".").slice(-2).join(".");
    const unique = [...new Set(matches.map((m) => m.toLowerCase()))];
    const domainMatches = unique.filter((email) => email.includes(hostRoot));
    const ordered = [...domainMatches, ...unique.filter((e) => !domainMatches.includes(e))];
    return ordered.filter((e) => !e.endsWith(".png") && !e.endsWith(".jpg"));
  }

  private extractPhones(html: string, text: string): string[] {
    const haystack = `${html}\n${text}`;
    const matches = haystack.match(
      /(?:\+90\s*|0\s*)?(?:\(?\d{3}\)?[\s.-]*)?\d{3}[\s.-]*\d{2}[\s.-]*\d{2}(?:[\s.-]*\d{2})?/g,
    );
    if (!matches) {
      return [];
    }
    return [...new Set(matches.map((p) => p.replace(/\s+/g, " ").trim()))].slice(
      0,
      3,
    );
  }

  private extractMersis(text: string): string | null {
    const match = text.match(/\b\d{16}\b/);
    return match ? match[0] : null;
  }

  private extractAddress(text: string): string | null {
    const street = text.match(
      /Yazgı\s+Sok\.?\s*No:\s*[\d/]+\s*İzmit\/Kocaeli/i,
    );
    if (street) {
      return `Yeşilova Mah. ${street[0]}`.replace(/\s+/g, " ").trim();
    }
    const patterns = [
      /Yeşilova\s+Mah\.?\s+Yazgı\s+Sok\.?\s*No:\s*[\d/]+\s*İzmit\/Kocaeli/i,
      /[A-ZÇĞİÖŞÜ][\wçğıöşüÇĞİÖŞÜ\s.'-]{2,40}\s+Mah\.?\s+[A-ZÇĞİÖŞÜ][\wçğıöşüÇĞİÖŞÜ\s.'-]{2,40}\s+Sok\.?\s*No:\s*[\d/]+[^a-z]{0,8}(?:İzmit\/Kocaeli|Kocaeli|İzmit)/i,
      /(?:Mah\.?|Cad\.?|Sok\.?|Sk\.?)\s+[^|]{10,120}(?:Kocaeli|İzmit|İstanbul|Ankara)/i,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0]
          .replace(/\s+/g, " ")
          .replace(/(?:factory|location_pin|mail|phone)[_\s]*/gi, "")
          .trim()
          .slice(0, 200);
      }
    }
    return null;
  }

  private extractCity(text: string, addressLine: string | null): string | null {
    const haystack = `${addressLine ?? ""} ${text}`;
    const cities = [
      "İzmit",
      "Kocaeli",
      "İstanbul",
      "Ankara",
      "İzmir",
      "Bursa",
      "Antalya",
      "Gaziantep",
    ];
    for (const city of cities) {
      if (haystack.includes(city)) {
        return city;
      }
    }
    const slashCity = haystack.match(/\/([A-ZÇĞİÖŞÜ][\wçğıöşü]+)/);
    return slashCity ? slashCity[1] : null;
  }

  private extractServicesSummary(text: string): string | null {
    const keywords = [
      "Lashing",
      "CFS",
      "Konteyner",
      "Reefer",
      "Depolama",
      "Lojistik",
      "Nakliye",
      "Taşımacılık",
    ];
    const found = keywords.filter((word) =>
      text.toLowerCase().includes(word.toLowerCase()),
    );
    if (found.length === 0) {
      return null;
    }
    return found.slice(0, 6).join(" · ");
  }

  private cleanLabel(raw: string): string {
    return raw.replace(/\s+/g, " ").trim();
  }
}
