import {
  Controller,
  Get,
  Headers,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ExternalFreightSearchCriteria,
  SubscriptionModuleCode,
} from "@nakliyeborsasi/core";
import { ExternalFreightSearchQueryDto } from "./ExternalFreightSearchQueryDto";
import { ModularSubscriptionEntitlementService } from "../subscription/ModularSubscriptionEntitlementService";
import { LocaleResolutionService } from "../localization/LocaleResolutionService";
import { IntegrationFreightSearchApplicationService } from "./IntegrationFreightSearchApplicationService";
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { AuthenticatedUserParam } from "../auth/AuthenticatedUserParam";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";

@Controller("integrations")
@UseGuards(JwtAuthenticationGuard)
export class ExternalFreightSearchController {
  public constructor(
    private readonly integrationFreightSearchApplicationService: IntegrationFreightSearchApplicationService,
    private readonly modularSubscriptionEntitlementService: ModularSubscriptionEntitlementService,
    private readonly localeResolutionService: LocaleResolutionService,
  ) {}

  @Get("freight-offers")
  public async searchExternalOffers(
    @Query() query: ExternalFreightSearchQueryDto,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
  ): Promise<{
    message: string;
    companyId: string;
    data: Awaited<
      ReturnType<
        IntegrationFreightSearchApplicationService["searchAggregatedOffers"]
      >
    >;
  }> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    await this.modularSubscriptionEntitlementService.assertModuleAccess(
      authenticatedUser.companyId,
      SubscriptionModuleCode.ExternalFeeds,
      locale,
    );
    const criteria = new ExternalFreightSearchCriteria({
      originCountryCode: query.originCountryCode ?? null,
      destinationCountryCode: query.destinationCountryCode ?? null,
      originCityQuery: query.originCityQuery ?? null,
      destinationCityQuery: query.destinationCityQuery ?? null,
      equipmentType: query.equipmentType ?? null,
      minimumWeightTonnes: query.minimumWeightTonnes ?? null,
      marketScope: query.marketScope ?? null,
      limit: query.limit ?? 25,
    });
    const aggregatedResult =
      await this.integrationFreightSearchApplicationService.searchAggregatedOffers(
        authenticatedUser.companyId,
        criteria,
        query.providers ?? null,
      );
    return {
      message: this.localeResolutionService.translate(
        locale,
        "marketplace.search_success",
      ),
      companyId: authenticatedUser.companyId,
      data: aggregatedResult,
    };
  }
}
