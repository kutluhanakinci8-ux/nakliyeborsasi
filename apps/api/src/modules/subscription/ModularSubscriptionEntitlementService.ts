import { Injectable } from "@nestjs/common";
import {
  SubscriptionEntitlementException,
  SubscriptionModuleCode,
} from "@nakliyeborsasi/core";
import { CompanySubscriptionStore } from "./CompanySubscriptionStore";
import { LocaleResolutionService } from "../localization/LocaleResolutionService";

@Injectable()
export class ModularSubscriptionEntitlementService {
  public constructor(
    private readonly companySubscriptionStore: CompanySubscriptionStore,
    private readonly localeResolutionService: LocaleResolutionService,
  ) {}

  public assertModuleAccess(
    companyId: string,
    moduleCode: SubscriptionModuleCode,
    locale: string,
  ): void {
    const snapshot = this.companySubscriptionStore.getSnapshot(companyId);
    if (!snapshot) {
      throw new SubscriptionEntitlementException(
        this.localeResolutionService.translate(
          locale,
          "errors.subscription_required",
          { moduleCode },
        ),
      );
    }
    const hasModule = snapshot.activePlan.includedModules.includes(moduleCode);
    if (!hasModule) {
      throw new SubscriptionEntitlementException(
        this.localeResolutionService.translate(
          locale,
          "errors.subscription_required",
          { moduleCode },
        ),
      );
    }
  }

  public getSearchTabLimit(companyId: string): number {
    const snapshot = this.companySubscriptionStore.getSnapshot(companyId);
    return snapshot?.activePlan.maxConcurrentSearchTabs ?? 1;
  }
}
