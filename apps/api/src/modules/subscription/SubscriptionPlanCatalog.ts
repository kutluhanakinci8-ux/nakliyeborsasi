import { Injectable } from "@nestjs/common";
import {
  SubscriptionModuleCode,
  SubscriptionPlanDefinition,
  SubscriptionTierCode,
} from "@nakliyeborsasi/core";

@Injectable()
export class SubscriptionPlanCatalog {
  private readonly plans: readonly SubscriptionPlanDefinition[];

  public constructor() {
    this.plans = [
      new SubscriptionPlanDefinition({
        planCode: "carrier_starter_tr_ua",
        tierCode: SubscriptionTierCode.Starter,
        includedModules: [
          SubscriptionModuleCode.MarketplaceSearch,
        ],
        maxConcurrentSearchTabs: 1,
        laneAnalyticsHistoryDays: 0,
      }),
      new SubscriptionPlanDefinition({
        planCode: "carrier_professional_tr_ua",
        tierCode: SubscriptionTierCode.Professional,
        includedModules: [
          SubscriptionModuleCode.MarketplaceSearch,
          SubscriptionModuleCode.ContactReveal,
          SubscriptionModuleCode.ExternalFeeds,
          SubscriptionModuleCode.LaneAnalytics,
          SubscriptionModuleCode.Auction,
          SubscriptionModuleCode.Messaging,
          SubscriptionModuleCode.TrustProfile,
        ],
        maxConcurrentSearchTabs: 3,
        laneAnalyticsHistoryDays: 15,
      }),
      new SubscriptionPlanDefinition({
        planCode: "forwarder_enterprise_tr_ua",
        tierCode: SubscriptionTierCode.Enterprise,
        includedModules: [
          SubscriptionModuleCode.MarketplaceSearch,
          SubscriptionModuleCode.ContactReveal,
          SubscriptionModuleCode.Auction,
          SubscriptionModuleCode.Messaging,
          SubscriptionModuleCode.TrustProfile,
          SubscriptionModuleCode.Fleet,
          SubscriptionModuleCode.LaneAnalytics,
          SubscriptionModuleCode.ExternalFeeds,
          SubscriptionModuleCode.ApiAccess,
        ],
        maxConcurrentSearchTabs: 10,
        laneAnalyticsHistoryDays: 90,
      }),
    ];
  }

  public listPlans(): readonly SubscriptionPlanDefinition[] {
    return this.plans;
  }

  public findPlanByCode(planCode: string): SubscriptionPlanDefinition | null {
    return this.plans.find((plan) => plan.planCode === planCode) ?? null;
  }
}
