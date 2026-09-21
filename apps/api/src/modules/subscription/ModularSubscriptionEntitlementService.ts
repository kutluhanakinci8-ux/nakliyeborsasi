import { Injectable } from "@nestjs/common";
import {
  SubscriptionEntitlementException,
  SubscriptionModuleCode,
} from "@nakliyeborsasi/core";
import { CompanySubscriptionPersistenceService } from "./CompanySubscriptionPersistenceService";
import { LocaleResolutionService } from "../localization/LocaleResolutionService";

@Injectable()
export class ModularSubscriptionEntitlementService {
  public constructor(
    private readonly companySubscriptionPersistenceService: CompanySubscriptionPersistenceService,
    private readonly localeResolutionService: LocaleResolutionService,
  ) {}

  public async assertModuleAccess(
    companyId: string,
    moduleCode: SubscriptionModuleCode,
    locale: string,
  ): Promise<void> {
    const snapshot =
      await this.companySubscriptionPersistenceService.getSnapshot(companyId);
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

  public async getSearchTabLimit(companyId: string): Promise<number> {
    const snapshot =
      await this.companySubscriptionPersistenceService.getSnapshot(companyId);
    return snapshot?.activePlan.maxConcurrentSearchTabs ?? 1;
  }
}
