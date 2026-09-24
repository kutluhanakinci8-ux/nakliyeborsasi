import { Injectable } from "@nestjs/common";
import {
  AuthorizationException,
  CompanyRoleCode,
  ResourceNotFoundException,
  SubscriptionPlanDefinition,
  ValidationException,
} from "@nakliyeborsasi/core";
import { CompanySubscriptionPersistenceService } from "./CompanySubscriptionPersistenceService";
import { SubscriptionPlanCatalog } from "./SubscriptionPlanCatalog";
import { SubscriptionPlanDisplayCatalog } from "./SubscriptionPlanDisplayCatalog";

@Injectable()
export class CompanySubscriptionApplicationService {
  public constructor(
    private readonly companySubscriptionPersistenceService: CompanySubscriptionPersistenceService,
    private readonly subscriptionPlanCatalog: SubscriptionPlanCatalog,
  ) {}

  public async getCompanySubscriptionView(
    companyId: string,
    roleCodes: readonly string[],
  ) {
    const snapshot =
      await this.companySubscriptionPersistenceService.getSnapshot(companyId);
    const catalog = this.subscriptionPlanCatalog.listPlans().map((plan) =>
      this.toPlanView(plan),
    );
    return {
      canManageSubscription: this.canManageSubscription(roleCodes),
      activePlan: snapshot ? this.toPlanView(snapshot.activePlan) : null,
      hasActiveSubscription: snapshot !== null,
      catalog,
    };
  }

  public async selectPlan(
    companyId: string,
    roleCodes: readonly string[],
    planCode: string,
  ) {
    if (!this.canManageSubscription(roleCodes)) {
      throw new AuthorizationException(
        "Only company owners or billing admins can change subscription",
      );
    }
    const plan = this.subscriptionPlanCatalog.findPlanByCode(planCode);
    if (!plan) {
      throw new ValidationException("Unknown subscription plan");
    }
    await this.companySubscriptionPersistenceService.assignActivePlan(
      companyId,
      plan.planCode,
    );
    const snapshot =
      await this.companySubscriptionPersistenceService.getSnapshot(companyId);
    if (!snapshot) {
      throw new ResourceNotFoundException("CompanySubscription", companyId);
    }
    return {
      activePlan: this.toPlanView(snapshot.activePlan),
      hasActiveSubscription: true,
    };
  }

  private canManageSubscription(roleCodes: readonly string[]): boolean {
    return roleCodes.some(
      (role) =>
        role === CompanyRoleCode.CompanyOwner ||
        role === CompanyRoleCode.BillingAdmin,
    );
  }

  private toPlanView(plan: SubscriptionPlanDefinition) {
    const display = SubscriptionPlanDisplayCatalog.find(plan.planCode);
    return {
      planCode: plan.planCode,
      tierCode: plan.tierCode,
      includedModules: plan.includedModules,
      maxConcurrentSearchTabs: plan.maxConcurrentSearchTabs,
      laneAnalyticsHistoryDays: plan.laneAnalyticsHistoryDays,
      displayName: display?.displayName ?? plan.planCode,
      tagline: display?.tagline ?? "",
      monthlyPriceEur: display?.monthlyPriceEur ?? null,
      annualPriceEur: display?.annualPriceEur ?? null,
      recommended: display?.recommended ?? false,
    };
  }
}
