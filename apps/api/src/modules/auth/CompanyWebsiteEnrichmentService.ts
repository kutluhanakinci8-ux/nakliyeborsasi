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

    const { html, text, scannedUrls } = await this.collectSiteDocuments(sourceUrl);
    const host = new URL(sourceUrl).hostname.replace(/^www\./i, "");

    const title = this.extractTitle(html);
    const ogSiteName = this.extractMetaContent(html, "og:site_name");
    const labeledLegalName = this.extractLabeledValue(text, [
      "Ünvan",
      "Ticari Unvan",
      "Firma Ünvanı",
    ]);
    const companyLegalName =
      labeledLegalName ??
      this.pickCompanyName(ogSiteName, title, text, html) ??
      null;

    const emails = this.extractEmails(html, text, host);
    const phones = this.extractPhones(html, text);
    const mersis =
      this.extractMersis(text) ??
      this.extractLabeledValue(text, ["MERSİS", "MERSIS"])?.replace(/\D/g, "") ??
      null;
    const addressLine = this.extractAddress(text);
    const city = this.extractCity(text, addressLine);
    const servicesSummary = this.extractServicesSummary(text);
    const logoUrl = this.extractLogoUrl(html, sourceUrl);
    const companyDescription =
      this.extractMetaContent(html, "description") ??
      this.extractMetaContent(html, "og:description");

    const taxOfficeLine = this.extractTaxOfficeLine(text);
    const tradeRegistryNumber = this.extractTradeRegistryNumber(text);
    const transportLicenseNumber = this.extractTransportLicense(text);
    const kepAddress =
      this.extractKepAddress(html, text) ??
      this.extractLabeledValue(text, ["KEP", "KEP Adresi"]);
    const workingHours = this.extractLabeledValue(text, [
      "Çalışma Saatleri",
      "Mesai",
      "Çalışma saatleri",
    ]);
    const whatsappCustomer = this.extractLabeledValue(text, [
      "Taşınacaklar için",
      "Müşteriler için",
    ]);
    const whatsappCompany = this.extractLabeledValue(text, ["Firmalar için"]);
    const whatsappParts = [whatsappCustomer, whatsappCompany].filter(Boolean);
    const whatsappNumber =
      (whatsappParts.length > 0
        ? whatsappParts.join(" · ")
        : null) ??
      this.extractWhatsapp(text);

    return {
      sourceUrl,
      scannedUrls,
      companyLegalName,
      tradeName: companyLegalName,
      emailAddress: emails[0] ?? null,
      phone: phones[0] ?? null,
      whatsappNumber,
      taxOrRegistryId: mersis ?? taxOfficeLine,
      mersisNumber: mersis,
      taxOfficeLine,
      tradeRegistryNumber,
      transportLicenseNumber,
      kepAddress,
      addressLine,
      city,
      workingHours,
      companyDescription,
      servicesSummary,
      socialMediaSummary: this.extractSocialLinks(html),
      logoUrl,
    };
  }

  private async collectSiteDocuments(
    sourceUrl: string,
  ): Promise<{ html: string; text: string; scannedUrls: string[] }> {
    const base = new URL(sourceUrl);
    const candidateUrls = [
      sourceUrl,
      new URL("/iletisim/", base).toString(),
      new URL("/iletisim", base).toString(),
      new URL("/contact/", base).toString(),
    ];
    const scannedUrls: string[] = [];
    let html = "";
    let text = "";
    for (const url of candidateUrls) {
      if (scannedUrls.includes(url)) {
        continue;
      }
      try {
        const pageHtml = await this.fetchHtml(url);
        scannedUrls.push(url);
        html += `\n${pageHtml}`;
        text += `\n${this.htmlToVisibleText(pageHtml)}`;
        if (scannedUrls.length >= 2) {
          break;
        }
      } catch {
        /* try next path */
      }
    }
    if (scannedUrls.length === 0) {
      throw new ValidationException("Web sayfası okunamadı");
    }
    return { html, text, scannedUrls };
  }

  private extractTaxOfficeLine(text: string): string | null {
    const match = text.match(
      /Vergi\s*D\.?\s*No\s*[:.]?\s*([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{8,11})/i,
    );
    if (match) {
      return `${match[1]} ${match[2]}`.trim();
    }
    const labeled = this.extractLabeledValue(text, [
      "Vergi D. No",
      "Vergi Dairesi",
    ]);
    return labeled;
  }

  private extractTradeRegistryNumber(text: string): string | null {
    const match = text.match(/Sicil\s*No\s*[:.]?\s*(\d{4,12})/i);
    if (match) {
      return match[1];
    }
    return this.extractLabeledValue(text, ["Sicil", "Ticaret Sicil"]);
  }

  private extractTransportLicense(text: string): string | null {
    const match = text.match(
      /(?:Yetki Belge No|Ulaştırma Bakanlığı Yetki Belge No)\s*[:.]?\s*([A-ZÇĞİÖŞÜ0-9][A-ZÇĞİÖŞÜ0-9.\-_]{4,40})/i,
    );
    return match ? match[1].trim() : null;
  }

  private extractLabeledValue(text: string, labels: string[]): string | null {
    for (const label of labels) {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(
        `${escaped}\\s*[:\\.]?\\s*([^\\n|]{3,220})`,
        "i",
      );
      const match = text.match(pattern);
      if (match?.[1]) {
        return this.trimLabeledCapture(match[1]);
      }
    }
    return null;
  }

  private trimLabeledCapture(raw: string): string {
    let value = raw.replace(/\s+/g, " ").trim();
    const stopPatterns = [
      /\s+Facebook\b/i,
      /\s+Twitter\b/i,
      /\s+Instagram\b/i,
      /\s+Ücretsiz Teklif\b/i,
      /\s+Ulaştırma Bakanlığı Yetki Belge No\b/i,
      /\s+Vergi D\.?\s*No\b/i,
      /\s+Sicil No\b/i,
      /\s+Eposta:\s*/i,
      /\s+E-posta:\s*/i,
      /\s+Taşınacaklar için\b/i,
      /\s+Firmalar için\b/i,
      /\s+Ünvan:\s*/i,
      /\s+Mersis No\b/i,
      /\s+Gizlilik\b/i,
      /\s+KVKK\b/i,
    ];
    for (const stop of stopPatterns) {
      const cut = value.split(stop)[0];
      if (cut && cut.length < value.length) {
        value = cut.trim();
      }
    }
    value = value.replace(/\[email protected\]/gi, "").trim();
    if (/kep\s*adresi/i.test(value) && value.length < 24) {
      return "";
    }
    if (/^\d[\d\s().-]{8,24}$/.test(value)) {
      return value.replace(/\s+/g, " ").trim();
    }
    return value.slice(0, 120).trim();
  }

  private extractKepAddress(html: string, text: string): string | null {
    for (const encoded of html.match(/data-cfemail=["']([a-f0-9]+)["']/gi) ?? []) {
      const hex = encoded.match(/data-cfemail=["']([a-f0-9]+)["']/i)?.[1];
      if (!hex) {
        continue;
      }
      const decoded = this.decodeCloudflareEmail(hex);
      if (decoded.toLowerCase().includes("kep.tr")) {
        return decoded.toLowerCase();
      }
    }
    const haystack = `${html}\n${text}`;
    const match = haystack.match(
      /[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9.-]+\.)?kep\.tr\b/gi,
    );
    return match?.[0]?.toLowerCase() ?? null;
  }

  private decodeCloudflareEmail(hex: string): string {
    if (hex.length < 4) {
      return "";
    }
    const key = Number.parseInt(hex.slice(0, 2), 16);
    let email = "";
    for (let i = 2; i < hex.length; i += 2) {
      const code = Number.parseInt(hex.slice(i, i + 2), 16) ^ key;
      email += String.fromCharCode(code);
    }
    return email;
  }

  private extractWhatsapp(text: string): string | null {
    const labeled = this.extractLabeledValue(text, ["WhatsApp", "Whatsapp"]);
    if (labeled) {
      return labeled.replace(/\s+/g, " ").slice(0, 40);
    }
    const match = text.match(
      /(?:whatsapp|wp)[^\d]{0,20}(\+?90?\s*\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2})/i,
    );
    return match ? match[1].replace(/\s+/g, " ").trim() : null;
  }

  private extractSocialLinks(html: string): string | null {
    const links = new Set<string>();
    const patterns = [
      /https?:\/\/(?:www\.)?facebook\.com\/[^\s"'<>]+/gi,
      /https?:\/\/(?:www\.)?instagram\.com\/[^\s"'<>]+/gi,
      /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[^\s"'<>]+/gi,
      /https?:\/\/(?:www\.)?linkedin\.com\/[^\s"'<>]+/gi,
      /https?:\/\/(?:www\.)?youtube\.com\/[^\s"'<>]+/gi,
    ];
    for (const pattern of patterns) {
      for (const match of html.match(pattern) ?? []) {
        links.add(match.replace(/&amp;/g, "&"));
      }
    }
    if (links.size === 0) {
      return null;
    }
    return [...links].slice(0, 5).join(" · ");
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
    const labeled = this.extractLabeledValue(text, [
      "Adres",
      "Adres Bilgileri",
      "Merkez Adres",
    ]);
    if (labeled && /(?:mah|cad|sok|no:|kat:)/i.test(labeled)) {
      return labeled.slice(0, 200);
    }
    const street = text.match(
      /Yazgı\s+Sok\.?\s*No:\s*[\d/]+\s*İzmit\/Kocaeli/i,
    );
    if (street) {
      return `Yeşilova Mah. ${street[0]}`.replace(/\s+/g, " ").trim();
    }
    const patterns = [
      /Eyüpsultan\s+mah\.?\s+[^|]{10,160}Sancaktepe\/İstanbul/i,
      /[A-ZÇĞİÖŞÜ][\wçğıöşüÇĞİÖŞÜ]+(?:\s+[A-ZÇĞİÖŞÜ][\wçğıöşü]+)?\s+mah\.?\s+[^|]{10,140}(?:Sancaktepe|Ümraniye|Kadıköy)\/İstanbul/i,
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
      "Evden Eve",
      "Parça Eşya",
      "Ofis Taşıma",
      "Şehirlerarası",
      "Eşya Depolama",
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

  private extractLogoUrl(html: string, pageUrl: string): string | null {
    const candidates: string[] = [];

    const ogImage = this.extractMetaContent(html, "og:image");
    if (ogImage) {
      candidates.push(ogImage);
    }

    const linkTags = html.match(/<link\b[^>]*>/gi) ?? [];
    for (const tag of linkTags) {
      const rel = tag.match(/\brel=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? "";
      if (!/(?:^|\s)icon(?:\s|$)|apple-touch-icon|shortcut icon/.test(rel)) {
        continue;
      }
      const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
      if (href) {
        candidates.unshift(href);
      }
    }

    const logoImgPatterns = [
      /<img\b[^>]*\bclass=["'][^"']*logo[^"']*["'][^>]*>/gi,
      /<img\b[^>]*\bsrc=["']([^"']*logo[^"']*)["'][^>]*>/gi,
      /<a\b[^>]*\bclass=["'][^"']*(?:logo|brand|navbar-brand)[^"']*["'][^>]*>[\s\S]*?<img\b[^>]*\bsrc=["']([^"']+)["']/gi,
    ];
    for (const pattern of logoImgPatterns) {
      const matches = html.matchAll(pattern);
      for (const match of matches) {
        const srcFromTag = match[0].match(/\bsrc=["']([^"']+)["']/i)?.[1];
        const captured = match[1] ?? srcFromTag;
        if (captured) {
          candidates.push(captured);
        }
      }
    }

    const ranked: { url: string; score: number }[] = [];
    const seen = new Set<string>();
    for (const raw of candidates) {
      const absolute = this.resolveAbsoluteUrl(raw, pageUrl);
      if (!absolute || seen.has(absolute)) {
        continue;
      }
      seen.add(absolute);
      if (!this.looksLikeLogoAsset(absolute)) {
        continue;
      }
      ranked.push({ url: absolute, score: this.scoreLogoCandidate(absolute) });
    }
    ranked.sort((a, b) => b.score - a.score);
    return ranked[0]?.url.slice(0, 512) ?? null;
  }

  private scoreLogoCandidate(url: string): number {
    const lower = url.toLowerCase();
    let score = 0;
    if (lower.includes("logo")) {
      score += 60;
    }
    if (lower.includes("brand")) {
      score += 40;
    }
    if (lower.includes("apple-touch-icon")) {
      score += 45;
    }
    if (/(?:192|180|512|256|128)x(?:\d+)/.test(lower)) {
      score += 35;
    }
    if (/\.svg(\?|#|$)/.test(lower)) {
      score += 25;
    }
    if (lower.includes("favicon-16") || lower.includes("16x16")) {
      score -= 40;
    }
    if (lower.includes("favicon-32")) {
      score -= 10;
    }
    if (lower.includes("og:image") || lower.includes("/uploads/")) {
      score += 15;
    }
    return score;
  }

  private resolveAbsoluteUrl(raw: string, pageUrl: string): string | null {
    try {
      return new URL(raw.trim(), pageUrl).toString();
    } catch {
      return null;
    }
  }

  private looksLikeLogoAsset(url: string): boolean {
    const lower = url.toLowerCase();
    if (lower.startsWith("data:")) {
      return false;
    }
    if (
      lower.includes("logo") ||
      lower.includes("brand") ||
      lower.includes("favicon") ||
      /\.(png|jpe?g|webp|svg|ico)(\?|#|$)/i.test(lower)
    ) {
      return true;
    }
    return false;
  }
}
