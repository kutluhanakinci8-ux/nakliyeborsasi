import { Controller, Get, Headers, Param, Query, UseGuards } from "@nestjs/common";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { JwtAuthenticationGuard } from "../../auth/JwtAuthenticationGuard";
import { AuthenticatedUserParam } from "../../auth/AuthenticatedUserParam";
import { LocaleResolutionService } from "../../localization/LocaleResolutionService";
import { TelemetryApplicationService } from "./TelemetryApplicationService";

@Controller("fleet/telematics/carrier")
@UseGuards(JwtAuthenticationGuard)
export class TelemetryCarrierController {
  public constructor(
    private readonly telemetryApplicationService: TelemetryApplicationService,
    private readonly localeResolutionService: LocaleResolutionService,
  ) {}

  @Get("live")
  public async liveMap(
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
  ) {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const snapshot = await this.telemetryApplicationService.getCarrierLiveMap(
      authenticatedUser.companyId,
      locale,
    );
    return { message: "OK", liveMap: snapshot };
  }

  @Get("drivers/:driverId/route")
  public async driverRoute(
    @Param("driverId") driverId: string,
    @Query("hours") hoursQuery: string | undefined,
    @Query("mode") modeQuery: string | undefined,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
  ) {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const hours = Number.parseInt(hoursQuery ?? "6", 10);
    const mode =
      modeQuery === "matched" || modeQuery === "raw" ? modeQuery : "road";
    const route = await this.telemetryApplicationService.getCarrierDriverRoute(
      authenticatedUser.companyId,
      driverId,
      locale,
      Number.isFinite(hours) ? Math.min(Math.max(hours, 1), 48) : 6,
      mode === "matched" ? "matched" : "road",
    );
    return { message: "OK", route };
  }
}
