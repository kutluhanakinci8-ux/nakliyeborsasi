import { describe, it, expect, vi, beforeEach } from "vitest";
import { SubscriptionModuleCode } from "@nakliyeborsasi/core";
import { SubscriptionEntitlementException } from "@nakliyeborsasi/core";
import { ModularSubscriptionEntitlementService } from "./ModularSubscriptionEntitlementService";
import type { CompanySubscriptionPersistenceService } from "./CompanySubscriptionPersistenceService";
import type { LocaleResolutionService } from "../localization/LocaleResolutionService";

describe("ModularSubscriptionEntitlementService", () => {
  const persistence = {
    getSnapshot: vi.fn(),
  } as unknown as CompanySubscriptionPersistenceService;

  const locale = {
    translate: vi.fn(
      (_locale: string, key: string, params: { moduleCode: string }) =>
        `${key}:${params.moduleCode}`,
    ),
  } as unknown as LocaleResolutionService;

  let service: ModularSubscriptionEntitlementService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ModularSubscriptionEntitlementService(persistence, locale);
  });

  it("assertModuleAccess passes when module included", async () => {
    vi.mocked(persistence.getSnapshot).mockResolvedValue({
      activePlan: {
        includedModules: [SubscriptionModuleCode.Messaging],
        maxConcurrentSearchTabs: 1,
      },
    } as never);

    await expect(
      service.assertModuleAccess("co-1", SubscriptionModuleCode.Messaging, "tr"),
    ).resolves.toBeUndefined();
  });

  it("assertModuleAccess throws when snapshot missing", async () => {
    vi.mocked(persistence.getSnapshot).mockResolvedValue(null);

    await expect(
      service.assertModuleAccess("co-1", SubscriptionModuleCode.Messaging, "tr"),
    ).rejects.toBeInstanceOf(SubscriptionEntitlementException);
  });

  it("assertModuleAccess throws when module not in plan", async () => {
    vi.mocked(persistence.getSnapshot).mockResolvedValue({
      activePlan: {
        includedModules: [SubscriptionModuleCode.Auction],
        maxConcurrentSearchTabs: 1,
      },
    } as never);

    await expect(
      service.assertModuleAccess("co-1", SubscriptionModuleCode.Messaging, "tr"),
    ).rejects.toMatchObject({ errorCode: "SUBSCRIPTION_ENTITLEMENT_DENIED" });
  });

  it("companyHasModule reflects snapshot", async () => {
    vi.mocked(persistence.getSnapshot).mockResolvedValue({
      activePlan: {
        includedModules: [SubscriptionModuleCode.Messaging],
        maxConcurrentSearchTabs: 1,
      },
    } as never);

    await expect(
      service.companyHasModule("co-1", SubscriptionModuleCode.Messaging),
    ).resolves.toBe(true);
  });
});
