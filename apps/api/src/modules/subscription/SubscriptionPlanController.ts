import { Controller, Get, Headers, Query } from "@nestjs/common";
import { SubscriptionModuleCode } from "@nakliyeborsasi/core";
import { SubscriptionPlanCatalog } from "./SubscriptionPlanCatalog";
import { SubscriptionPlanDisplayCatalog } from "./SubscriptionPlanDisplayCatalog";
import { LocaleResolutionService } from "../localization/LocaleResolutionService";

@Controller("subscriptions")
export class SubscriptionPlanController {
  public constructor(
    private readonly subscriptionPlanCatalog: SubscriptionPlanCatalog,
    private readonly localeResolutionService: LocaleResolutionService,
  ) {}

  @Get("plans")
  public listPlans(
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
  ): {
    message: string;
    plans: ReturnType<SubscriptionPlanCatalog["listPlans"]>;
  } {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    return {
      message: this.localeResolutionService.translate(
        locale,
        "subscription.plan_listed",
      ),
      plans: this.subscriptionPlanCatalog.listPlans(),
    };
  }

  @Get("mail-plans")
  public listMailPlans(): {
    message: string;
    plans: {
      planCode: string;
      displayName: string;
      tagline: string;
      monthlyPriceEur: number;
      annualPriceEur: number;
      recommended: boolean;
      mailMaxSendsPerHour: number;
      customDomainAllowed: boolean;
    }[];
  } {
    const plans = this.subscriptionPlanCatalog
      .listPlans()
      .filter((plan) =>
        plan.includedModules.includes(SubscriptionModuleCode.LertaMail),
      )
      .map((plan) => {
        const display = SubscriptionPlanDisplayCatalog.find(plan.planCode);
        return {
          planCode: plan.planCode,
          displayName: display?.displayName ?? plan.planCode,
          tagline: display?.tagline ?? "",
          monthlyPriceEur: display?.monthlyPriceEur ?? 0,
          annualPriceEur: display?.annualPriceEur ?? 0,
          recommended: display?.recommended ?? false,
          mailMaxSendsPerHour: display?.mailMaxSendsPerHour ?? 80,
          customDomainAllowed: display?.customDomainAllowed ?? false,
        };
      });
    return { message: "OK", plans };
  }
}
