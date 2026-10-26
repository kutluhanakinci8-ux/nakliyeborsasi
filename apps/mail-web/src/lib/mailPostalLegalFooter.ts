import {
  appendLertaPostalMarker,
  extractLertaPostalMarker,
  stripLertaPostalMarker,
  type LertaPostalAddressPayload,
} from "@nakliyeborsasi/core";
import { formatPostalAddress } from "./mailAddressFormat";

export function parseBrandingLegalFooter(stored: string | null | undefined): {
  legalNotes: string;
  postal: LertaPostalAddressPayload | null;
} {
  const raw = stored?.trim() ?? "";
  if (!raw) {
    return { legalNotes: "", postal: null };
  }
  const postal = extractLertaPostalMarker(raw);
  let visible = stripLertaPostalMarker(raw);
  if (postal) {
    const formatted = formatPostalAddress(postal, {
      abbreviate: false,
      appendCountry: true,
    }).trim();
    if (formatted && visible.startsWith(formatted)) {
      visible = visible.slice(formatted.length).trimStart();
      if (visible.startsWith("\n")) {
        visible = visible.replace(/^\n+/, "");
      }
    }
  }
  return { legalNotes: visible, postal };
}

export function buildBrandingLegalFooterForSave(
  legalNotes: string,
  postal: LertaPostalAddressPayload | null,
): string | null {
  const notes = legalNotes.trim();
  const hasPostal =
    postal &&
    Boolean(
      postal.road?.trim() ||
        postal.city?.trim() ||
        postal.postcode?.trim(),
    );
  if (!hasPostal && !notes) {
    return null;
  }
  const parts: string[] = [];
  if (hasPostal && postal) {
    parts.push(
      formatPostalAddress(postal, { abbreviate: false, appendCountry: true }),
    );
  }
  if (notes) {
    parts.push(notes);
  }
  const body = parts.join("\n");
  if (hasPostal && postal) {
    return appendLertaPostalMarker(body, postal);
  }
  return body;
}
