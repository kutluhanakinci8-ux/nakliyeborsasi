/** Nest API hata gövdesi (JSON veya düz metin) — modül aboneliği 403. */
export function isSubscriptionEntitlementDeniedError(
  errorBody: string,
  moduleCode?: string,
): boolean {
  const trimmed = errorBody.trim();
  if (!trimmed) {
    return false;
  }
  if (trimmed.includes("SUBSCRIPTION_ENTITLEMENT_DENIED")) {
    if (!moduleCode) {
      return true;
    }
    return trimmed.includes(moduleCode);
  }
  try {
    const parsed = JSON.parse(trimmed) as {
      errorCode?: string;
      message?: string;
    };
    if (parsed.errorCode !== "SUBSCRIPTION_ENTITLEMENT_DENIED") {
      return false;
    }
    if (!moduleCode) {
      return true;
    }
    const message = parsed.message ?? "";
    return message.includes(moduleCode);
  } catch {
    return false;
  }
}
