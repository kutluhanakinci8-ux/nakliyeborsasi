import { describe, it, expect } from "vitest";
import { isSubscriptionEntitlementDeniedError } from "./isSubscriptionEntitlementDeniedError";

describe("isSubscriptionEntitlementDeniedError", () => {
  it("detects JSON errorCode", () => {
    const body = JSON.stringify({
      errorCode: "SUBSCRIPTION_ENTITLEMENT_DENIED",
      message: "Bu özellik için modüler abonelik gerekir: MESSAGING",
    });
    expect(isSubscriptionEntitlementDeniedError(body)).toBe(true);
    expect(isSubscriptionEntitlementDeniedError(body, "MESSAGING")).toBe(true);
    expect(isSubscriptionEntitlementDeniedError(body, "AUCTION")).toBe(false);
  });

  it("detects raw substring", () => {
    expect(
      isSubscriptionEntitlementDeniedError("SUBSCRIPTION_ENTITLEMENT_DENIED"),
    ).toBe(true);
  });

  it("rejects other errors", () => {
    expect(isSubscriptionEntitlementDeniedError('{"errorCode":"OTHER"}')).toBe(
      false,
    );
    expect(isSubscriptionEntitlementDeniedError("")).toBe(false);
  });
});
