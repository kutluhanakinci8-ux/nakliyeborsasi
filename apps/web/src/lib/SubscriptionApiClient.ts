import { AuthenticatedApiClient } from "./AuthenticatedApiClient";

export type CompanySubscriptionPlanView = {
  planCode: string;
  tierCode: string;
  includedModules: string[];
  maxConcurrentSearchTabs: number;
  laneAnalyticsHistoryDays: number;
  displayName: string;
  tagline: string;
  monthlyPriceEur: number | null;
  annualPriceEur: number | null;
  recommended: boolean;
};

export type CompanySubscriptionView = {
  canManageSubscription: boolean;
  activePlan: CompanySubscriptionPlanView | null;
  hasActiveSubscription: boolean;
  catalog: CompanySubscriptionPlanView[];
};

type CurrentSubscriptionResponse = {
  message: string;
  subscription: CompanySubscriptionView;
};

type SelectPlanResponse = {
  message: string;
  activePlan: CompanySubscriptionPlanView;
  hasActiveSubscription: boolean;
};

export class SubscriptionApiClient {
  public static async fetchCompanySubscription(
    accessToken: string,
  ): Promise<CompanySubscriptionView> {
    const payload = (await AuthenticatedApiClient.fetchJson(
      accessToken,
      "/subscriptions/company/current",
    )) as CurrentSubscriptionResponse;
    return payload.subscription;
  }

  public static async selectCompanyPlan(
    accessToken: string,
    planCode: string,
  ): Promise<SelectPlanResponse> {
    return (await AuthenticatedApiClient.fetchJson(
      accessToken,
      "/subscriptions/company/select-plan",
      {
        method: "POST",
        body: JSON.stringify({ planCode }),
      },
    )) as SelectPlanResponse;
  }
}
