import type { MailBillingPlatformStatus } from "./mailApi";

const DISMISS_KEY = "lerta-mail-pilot-billing-dismissed";

export function isMailPilotFreePublicEnv(): boolean {
  return process.env.NEXT_PUBLIC_MAIL_BILLING_PILOT_FREE === "1";
}

export function shouldShowPilotBillingNotice(
  status: MailBillingPlatformStatus | null | undefined,
): boolean {
  if (isMailPilotFreePublicEnv()) {
    return true;
  }
  if (!status) {
    return false;
  }
  if (status.productionReady) {
    return false;
  }
  return !status.checkout.canStartCorporate;
}

export function isPilotBillingNoticeDismissed(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissPilotBillingNotice(): void {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* ignore */
  }
}
