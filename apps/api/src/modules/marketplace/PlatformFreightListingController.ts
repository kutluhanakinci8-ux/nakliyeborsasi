import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { PlatformFreightListingService } from "./PlatformFreightListingService";
import { CreatePlatformFreightListingDto } from "./CreatePlatformFreightListingDto";
import { PlatformFreightListingSearchQueryDto } from "./PlatformFreightListingSearchQueryDto";
import { LocaleResolutionService } from "../localization/LocaleResolutionService";
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { AuthenticatedUserParam } from "../auth/AuthenticatedUserParam";

@Controller("marketplace")
@UseGuards(JwtAuthenticationGuard)
export class PlatformFreightListingController {
  public constructor(
    private readonly platformFreightListingService: PlatformFreightListingService,
    private readonly localeResolutionService: LocaleResolutionService,
  ) {}

  @Get("listings")
  public async searchListings(
    @Query() query: PlatformFreightListingSearchQueryDto,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
  ): Promise<{ message: string; listings: readonly unknown[] }> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const listings = await this.platformFreightListingService.searchListings(
      authenticatedUser.companyId,
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
  public async createListing(
    @Body() body: CreatePlatformFreightListingDto,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
  ): Promise<{ message: string; listing: unknown }> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const listing = await this.platformFreightListingService.createListing(
      authenticatedUser.companyId,
      body,
      locale,
    );
    return {
      message: this.platformFreightListingService.translateSuccess(locale),
      listing,
    };
  }
}
