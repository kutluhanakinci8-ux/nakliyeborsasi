import type { AuthSessionRecord } from "./SessionApiClient";

const PLATFORM_ADMIN_EMAILS = new Set([
  "demo@nakliyeborsasi.local",
  "partner@nakliyeborsasi.local",
  "admin@nakliyeborsasi.local",
]);

export function isPlatformAdmin(session: AuthSessionRecord | null): boolean {
  if (!session?.emailAddress) {
    return false;
  }
  const email = session.emailAddress.trim().toLowerCase();
  if (PLATFORM_ADMIN_EMAILS.has(email)) {
    return true;
  }
  return session.roleCodes.includes("COMPANY_OWNER");
}
