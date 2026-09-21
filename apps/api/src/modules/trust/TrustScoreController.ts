import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { AuthenticatedUserParam } from "../auth/AuthenticatedUserParam";
import { LocaleResolutionService } from "../localization/LocaleResolutionService";
import { TrustScoreApplicationService } from "./TrustScoreApplicationService";
import { SubmitCompanyTrustReviewRequestDto } from "./SubmitCompanyTrustReviewRequestDto";

@Controller("trust-scores")
export class TrustScoreController {
  public constructor(
    private readonly trustScoreApplicationService: TrustScoreApplicationService,
    private readonly localeResolutionService: LocaleResolutionService,
  ) {}

  @Get("companies/:companyId")
  public async getCompanyTrustSnapshot(
    @Param("companyId") companyId: string,
  ): Promise<{ snapshot: unknown }> {
    const snapshot =
      await this.trustScoreApplicationService.getCompanyTrustSnapshot(
        companyId,
      );
    return { snapshot };
  }

  @Post("companies/:companyId/reviews")
  @UseGuards(JwtAuthenticationGuard)
  public async submitReview(
    @Param("companyId") companyId: string,
    @Body() body: SubmitCompanyTrustReviewRequestDto,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
  ): Promise<{ review: unknown }> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const review = await this.trustScoreApplicationService.submitReview(
      authenticatedUser,
      companyId,
      body,
      locale,
    );
    return { review };
  }
}
