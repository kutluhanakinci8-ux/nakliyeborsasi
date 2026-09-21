import { Injectable } from "@nestjs/common";
import { CompanySubscriptionSnapshot } from "@nakliyeborsasi/core";
import { SubscriptionPlanCatalog } from "./SubscriptionPlanCatalog";

@Injectable()
export class CompanySubscriptionStore {
  private readonly subscriptions: Map<string, CompanySubscriptionSnapshot> =
    new Map();

  public constructor(
    private readonly subscriptionPlanCatalog: SubscriptionPlanCatalog,
  ) {
    const defaultPlan = this.subscriptionPlanCatalog.findPlanByCode(
      "carrier_professional_tr_ua",
    );
    if (defaultPlan) {
      this.subscriptions.set(
        "demo-company-001",
        new CompanySubscriptionSnapshot("demo-company-001", defaultPlan),
      );
    }
  }

  public getSnapshot(companyId: string): CompanySubscriptionSnapshot | null {
    return this.subscriptions.get(companyId) ?? null;
  }
}
