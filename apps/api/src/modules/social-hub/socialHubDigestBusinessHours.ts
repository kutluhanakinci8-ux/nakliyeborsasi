import { ValidationException } from "@nakliyeborsasi/core";

const ALLOWED_TIMEZONES = new Set([
  "Europe/Istanbul",
  "Europe/London",
  "UTC",
  "Europe/Berlin",
]);

export type DigestBusinessHoursSettings = {
  socialSlackDigestBusinessHoursOnly: boolean;
  socialSlackDigestTimezone: string;
  socialSlackDigestHourStart: number;
  socialSlackDigestHourEnd: number;
};

export function normalizeSocialHubDigestTimezone(raw: string | null | undefined): string {
  const trimmed = raw?.trim() || "Europe/Istanbul";
  if (!ALLOWED_TIMEZONES.has(trimmed)) {
    throw new ValidationException(
      "Geçersiz saat dilimi. Örnek: Europe/Istanbul, UTC",
    );
  }
  return trimmed;
}

export function isDigestWithinBusinessHours(
  settings: DigestBusinessHoursSettings,
  at: Date = new Date(),
): boolean {
  if (!settings.socialSlackDigestBusinessHoursOnly) {
    return true;
  }
  const hour = getHourInTimezone(at, settings.socialSlackDigestTimezone);
  const start = clampHour(settings.socialSlackDigestHourStart);
  const end = clampHour(settings.socialSlackDigestHourEnd);
  if (start === end) {
    return true;
  }
  if (start < end) {
    return hour >= start && hour < end;
  }
  return hour >= start || hour < end;
}

function clampHour(value: number): number {
  return Math.min(Math.max(Math.floor(value), 0), 23);
}

function getHourInTimezone(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hour12: false,
  }).formatToParts(date);
  const hourPart = parts.find((part) => part.type === "hour");
  return Number.parseInt(hourPart?.value ?? "0", 10);
}
