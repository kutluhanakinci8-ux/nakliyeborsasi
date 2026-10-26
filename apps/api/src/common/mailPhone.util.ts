import { BadRequestException } from "@nestjs/common";
import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

const DEFAULT_COUNTRY: CountryCode = "TR";

/** Kurumsal kişi telefonu — E.164 saklama; geçersizse 400. */
export function normalizeMailContactPhone(
  raw: string | null | undefined,
  defaultCountry: CountryCode = DEFAULT_COUNTRY,
): string | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = parsePhoneNumberFromString(trimmed, defaultCountry);
  if (!parsed?.isValid()) {
    throw new BadRequestException("Geçersiz telefon numarası.");
  }
  return parsed.format("E.164");
}

export function formatMailContactPhoneForDisplay(
  e164: string | null | undefined,
  defaultCountry: CountryCode = DEFAULT_COUNTRY,
): string | null {
  if (!e164?.trim()) {
    return null;
  }
  const parsed = parsePhoneNumberFromString(e164, defaultCountry);
  if (!parsed?.isValid()) {
    return e164;
  }
  return parsed.formatInternational();
}
