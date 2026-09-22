import type { AuthSessionRecord } from "./SessionApiClient";

/** Yalnızca platform konsoluna (/admin) giriş yapabilen hesaplar */
const PLATFORM_CONSOLE_EMAILS = new Set(["admin@nakliyeborsasi.local"]);

export function isPlatformAdmin(session: AuthSessionRecord | null): boolean {
  if (!session?.emailAddress) {
    return false;
  }
  return PLATFORM_CONSOLE_EMAILS.has(session.emailAddress.trim().toLowerCase());
}
