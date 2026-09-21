import {
  Controller,
  Get,
  Headers,
  Query,
  Req,
} from "@nestjs/common";
import { Request } from "express";
import {
  ExternalFreightSearchCriteria,
  SubscriptionModuleCode,
} from "@nakliyeborsasi/core";
import { ExternalFreightSearchQueryDto } from "./ExternalFreightSearchQueryDto";
import { ExternalFreightDataOrchestrator } from "./ExternalFreightDataOrchestrator";
import { ModularSubscriptionEntitlementService } from "../subscription/ModularSubscriptionEntitlementService";
import { LocaleResolutionService } from "../localization/LocaleResolutionService";
import { RequestCompanyContextExtractor } from "../identity/RequestCompanyContextExtractor";

@Controller("integrations")
export class ExternalFreightSearchController {
  public constructor(
    private readonly externalFreightDataOrchestrator: ExternalFreightDataOrchestrator,
    private readonly modularSubscriptionEntitlementService: ModularSubscriptionEntitlementService,
    private readonly localeResolutionService: LocaleResolutionService,
    private readonly requestCompanyContextExtractor: RequestCompanyContextExtractor,
  ) {}

  @Get("freight-offers")
  public async searchExternalOffers(
    @Query() query: ExternalFreightSearchQueryDto,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
    @Req() request: Request,
  ): Promise<{
    message: string;
    companyId: string;
    data: Awaited<
      ReturnType<ExternalFreightDataOrchestrator["searchAllProviders"]>
    >;
  }> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const companyId =
      this.requestCompanyContextExtractor.extractCompanyId(request);
    this.modularSubscriptionEntitlementService.assertModuleAccess(
      companyId,
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
      await this.externalFreightDataOrchestrator.searchAllProviders(
        criteria,
        query.providers ?? null,
      );
    return {
      message: this.localeResolutionService.translate(
        locale,
        "marketplace.search_success",
      ),
      companyId,
      data: aggregatedResult,
    };
  }
}
