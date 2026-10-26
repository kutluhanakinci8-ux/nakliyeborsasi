import { format as formatAddress } from "@fragaria/address-formatter";
import type { LertaPostalAddressPayload } from "@nakliyeborsasi/core";

export type { LertaPostalAddressPayload };

export function postalPayloadToFormatterInput(
  payload: LertaPostalAddressPayload,
): Record<string, string | number> {
  const countryCode = payload.countryCode.trim().toUpperCase();
  const input: Record<string, string | number> = { countryCode };
  if (payload.houseNumber?.trim()) {
    input.houseNumber = payload.houseNumber.trim();
  }
  if (payload.road?.trim()) {
    input.road = payload.road.trim();
  }
  if (payload.city?.trim()) {
    input.city = payload.city.trim();
  }
  if (payload.postcode?.trim()) {
    input.postcode = payload.postcode.trim();
  }
  if (payload.state?.trim()) {
    input.state = payload.state.trim();
  }
  if (payload.suburb?.trim()) {
    input.suburb = payload.suburb.trim();
  }
  return input;
}

/** Ülke kurallarına göre posta adresi (OpenCage / address-formatting). */
export function formatPostalAddress(
  payload: LertaPostalAddressPayload,
  options?: { abbreviate?: boolean; appendCountry?: boolean },
): string {
  const input = postalPayloadToFormatterInput(payload);
  if (!input.road && !input.city && !input.postcode) {
    return "";
  }
  return formatAddress(input, {
    abbreviate: options?.abbreviate ?? false,
    appendCountry: options?.appendCountry ?? true,
    countryCode: input.countryCode as string,
  });
}

/** Harita / yol tarifi sorgusu için tek satır, kısaltılmış adres. */
export function formatPostalAddressForDirections(
  payload: LertaPostalAddressPayload,
): string {
  const formatted = formatPostalAddress(payload, {
    abbreviate: true,
    appendCountry: true,
  });
  return formatted.replace(/\s*\n+\s*/g, ", ").trim();
}

/** Serbest metin (dipnot vb.) — satır sonlarını navigasyon için sıkıştırır. */
export function normalizeFreeformAddressForDirections(raw: string): string {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return "";
  }
  if (lines.length === 1) {
    return lines[0];
  }
  return lines.join(", ");
}

export function directionsQueryFromLegalFooter(
  legalFooter: string | null | undefined,
  payload: LertaPostalAddressPayload | null,
): string {
  if (payload) {
    const q = formatPostalAddressForDirections(payload);
    if (q) {
      return q;
    }
  }
  return normalizeFreeformAddressForDirections(legalFooter ?? "");
}
