import { SubscriptionModuleCode } from "../constants/SubscriptionModuleCode";
import { SubscriptionTierCode } from "../constants/SubscriptionModuleCode";

export class SubscriptionPlanDefinition {
  public readonly planCode: string;

  public readonly tierCode: SubscriptionTierCode;

  public readonly includedModules: readonly SubscriptionModuleCode[];

  public readonly maxConcurrentSearchTabs: number;

  public readonly laneAnalyticsHistoryDays: number;

  public constructor(params: {
    planCode: string;
    tierCode: SubscriptionTierCode;
    includedModules: readonly SubscriptionModuleCode[];
    maxConcurrentSearchTabs: number;
    laneAnalyticsHistoryDays: number;
  }) {
    this.planCode = params.planCode;
    this.tierCode = params.tierCode;
    this.includedModules = params.includedModules;
    this.maxConcurrentSearchTabs = params.maxConcurrentSearchTabs;
    this.laneAnalyticsHistoryDays = params.laneAnalyticsHistoryDays;
  }
}

export class CompanySubscriptionSnapshot {
  public readonly companyId: string;

  public readonly activePlan: SubscriptionPlanDefinition;

  public constructor(companyId: string, activePlan: SubscriptionPlanDefinition) {
    this.companyId = companyId;
    this.activePlan = activePlan;
  }
}
