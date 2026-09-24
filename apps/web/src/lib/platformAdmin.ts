import { isPlatformOperatorEmail } from "@nakliyeborsasi/core";
import type { AuthSessionRecord } from "./SessionApiClient";

export function isPlatformAdmin(session: AuthSessionRecord | null): boolean {
  if (!session?.emailAddress) {
    return false;
  }
  return isPlatformOperatorEmail(session.emailAddress);
}
