import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

const DEFAULT_COUNTRY: CountryCode = "TR";

export function formatContactPhoneForDisplay(
  phone: string | null | undefined,
  defaultCountry: CountryCode = DEFAULT_COUNTRY,
): string | null {
  if (!phone?.trim()) {
    return null;
  }
  const parsed = parsePhoneNumberFromString(phone, defaultCountry);
  if (!parsed?.isValid()) {
    return phone.trim();
  }
  return parsed.formatInternational();
}

export function isContactPhonePlausible(
  raw: string,
  defaultCountry: CountryCode = DEFAULT_COUNTRY,
): boolean {
  const trimmed = raw.trim();
  if (!trimmed) {
    return true;
  }
  const parsed = parsePhoneNumberFromString(trimmed, defaultCountry);
  return Boolean(parsed?.isValid());
}
