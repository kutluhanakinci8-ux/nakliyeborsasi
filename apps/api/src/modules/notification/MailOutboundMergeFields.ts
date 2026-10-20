import { escapeHtml } from "./MailOutboundHtmlEscape";

export type OutboundMergeContext = {
  firmaAdi: string;
  gonderenAd?: string | null;
  gonderenEposta?: string | null;
  aliciEposta?: string | null;
  referans?: string | null;
  musteriAdi?: string | null;
  /** ISO veya Date; varsayılan bugün (TR). */
  bugun?: Date;
};

const TOKEN_PATTERN = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

export function applyOutboundMergeFields(
  text: string,
  html?: string,
  context?: OutboundMergeContext,
): { text: string; html?: string } {
  if (!context) {
    return { text, html };
  }
  const values = buildMergeValueMap(context);
  return {
    text: replaceMergeTokens(text, values, false),
    html: html ? replaceMergeTokens(html, values, true) : undefined,
  };
}

function buildMergeValueMap(
  context: OutboundMergeContext,
): Record<string, string> {
  const date = context.bugun ?? new Date();
  const bugunFormatted = formatTrDate(date);
  const raw: Record<string, string> = {
    firma_adi: context.firmaAdi.trim(),
    firma: context.firmaAdi.trim(),
    gonderen_ad: context.gonderenAd?.trim() ?? "",
    gonderen_eposta: context.gonderenEposta?.trim() ?? "",
    alici_eposta: context.aliciEposta?.trim() ?? "",
    referans: context.referans?.trim() ?? "",
    musteri_adi: context.musteriAdi?.trim() ?? "",
    musteri: context.musteriAdi?.trim() ?? "",
    bugun: bugunFormatted,
  };
  return raw;
}

function replaceMergeTokens(
  input: string,
  values: Record<string, string>,
  htmlEscapeValues: boolean,
): string {
  return input.replace(TOKEN_PATTERN, (match, key: string) => {
    const normalized = key.toLowerCase();
    const value = values[normalized];
    if (value === undefined) {
      return match;
    }
    if (!value) {
      return "";
    }
    return htmlEscapeValues ? escapeHtml(value) : value;
  });
}

function formatTrDate(date: Date): string {
  return date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function parseSenderFromHeader(fromHeader?: string): {
  gonderenAd: string | null;
  gonderenEposta: string | null;
} {
  const trimmed = fromHeader?.trim();
  if (!trimmed) {
    return { gonderenAd: null, gonderenEposta: null };
  }
  const angle = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  if (angle) {
    const name = angle[1].replace(/^"|"$|^'|'$/g, "").trim();
    return { gonderenAd: name || null, gonderenEposta: angle[2].trim() };
  }
  if (trimmed.includes("@")) {
    return { gonderenAd: null, gonderenEposta: trimmed };
  }
  return { gonderenAd: trimmed, gonderenEposta: null };
}
