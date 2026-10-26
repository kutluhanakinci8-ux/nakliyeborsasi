import { describe, it, expect } from "vitest";
import {
  AuthenticatedUserContext,
  CompanyParticipantTypeCode,
  CompanyRoleCode,
  SubscriptionEntitlementException,
  SubscriptionModuleCode,
} from "@nakliyeborsasi/core";
import { ModularSubscriptionEntitlementService } from "../subscription/ModularSubscriptionEntitlementService";

/**
 * Messaging HTTP 403 sözleşmesi — listThreads öncesi assertModuleAccess(Messaging).
 * Tam HTTP harness yerine entitlement + exception kodu kilidi.
 */
describe("messaging subscription gate", () => {
  const user = new AuthenticatedUserContext({
    userId: "user-1",
    companyId: "co-1",
    emailAddress: "test@example.com",
    roleCodes: [CompanyRoleCode.CompanyOwner],
    companyParticipantTypeCode: CompanyParticipantTypeCode.LoadShipper,
  });

  it("SubscriptionEntitlementException carries API error code", () => {
    const error = new SubscriptionEntitlementException(
      `modül: ${SubscriptionModuleCode.Messaging}`,
    );
    expect(error.errorCode).toBe("SUBSCRIPTION_ENTITLEMENT_DENIED");
    expect(error.httpStatus).toBe(403);
  });

  it("ModularSubscriptionEntitlementService denies missing snapshot", async () => {
    const persistence = {
      getSnapshot: async () => null,
    };
    const locale = {
      translate: (_l: string, _k: string, p: { moduleCode: string }) =>
        `denied:${p.moduleCode}`,
    };
    const service = new ModularSubscriptionEntitlementService(
      persistence as never,
      locale as never,
    );
    await expect(
      service.assertModuleAccess(
        user.companyId,
        SubscriptionModuleCode.Messaging,
        "tr",
      ),
    ).rejects.toBeInstanceOf(SubscriptionEntitlementException);
  });
});
