import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { AuthenticatedUserParam } from "../auth/AuthenticatedUserParam";
import { CompanySubscriptionApplicationService } from "./CompanySubscriptionApplicationService";
import { SelectCompanySubscriptionPlanRequestDto } from "./SelectCompanySubscriptionPlanRequestDto";

@Controller("subscriptions/company")
@UseGuards(JwtAuthenticationGuard)
export class CompanySubscriptionController {
  public constructor(
    private readonly companySubscriptionApplicationService: CompanySubscriptionApplicationService,
  ) {}

  @Get("current")
  public async current(@AuthenticatedUserParam() user: AuthenticatedUserContext) {
    const subscription =
      await this.companySubscriptionApplicationService.getCompanySubscriptionView(
        user.companyId,
        user.roleCodes,
      );
    return { message: "OK", subscription };
  }

  @Post("select-plan")
  public async selectPlan(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: SelectCompanySubscriptionPlanRequestDto,
  ) {
    const result = await this.companySubscriptionApplicationService.selectPlan(
      user.companyId,
      user.roleCodes,
      body.planCode,
    );
    return { message: "OK", ...result };
  }
}
