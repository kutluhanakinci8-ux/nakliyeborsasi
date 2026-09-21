import { Controller, Get, Headers, Query } from "@nestjs/common";
import { SubscriptionPlanCatalog } from "./SubscriptionPlanCatalog";
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
}
