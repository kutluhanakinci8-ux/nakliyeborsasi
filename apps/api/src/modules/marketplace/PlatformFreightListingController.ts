import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { Request } from "express";
import { PlatformFreightListingService } from "./PlatformFreightListingService";
import { CreatePlatformFreightListingDto } from "./CreatePlatformFreightListingDto";
import { PlatformFreightListingSearchQueryDto } from "./PlatformFreightListingSearchQueryDto";
import { LocaleResolutionService } from "../localization/LocaleResolutionService";
import { RequestCompanyContextExtractor } from "../identity/RequestCompanyContextExtractor";

@Controller("marketplace")
export class PlatformFreightListingController {
  public constructor(
    private readonly platformFreightListingService: PlatformFreightListingService,
    private readonly localeResolutionService: LocaleResolutionService,
    private readonly requestCompanyContextExtractor: RequestCompanyContextExtractor,
  ) {}

  @Get("listings")
  public searchListings(
    @Query() query: PlatformFreightListingSearchQueryDto,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
    @Req() request: Request,
  ): { message: string; listings: readonly unknown[] } {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const companyId =
      this.requestCompanyContextExtractor.extractCompanyId(request);
    const listings = this.platformFreightListingService.searchListings(
      companyId,
      query.originCountryCode ?? null,
      query.destinationCountryCode ?? null,
      query.marketScope ?? null,
      locale,
    );
    return {
      message: this.platformFreightListingService.translateSuccess(locale),
      listings,
    };
  }

  @Post("listings")
  public createListing(
    @Body() body: CreatePlatformFreightListingDto,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
    @Req() request: Request,
  ): { message: string; listing: unknown } {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const companyId =
      this.requestCompanyContextExtractor.extractCompanyId(request);
    const listing = this.platformFreightListingService.createListing(
      companyId,
      body,
      locale,
    );
    return {
      message: this.platformFreightListingService.translateSuccess(locale),
      listing,
    };
  }
}
