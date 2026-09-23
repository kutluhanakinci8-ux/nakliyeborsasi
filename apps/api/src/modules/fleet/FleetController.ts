import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { FleetApplicationService } from "./FleetApplicationService";
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { AuthenticatedUserParam } from "../auth/AuthenticatedUserParam";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { LocaleResolutionService } from "../localization/LocaleResolutionService";
import { CreateFleetDriverRequestDto } from "./CreateFleetDriverRequestDto";
import { UpdateFleetDriverRequestDto } from "./UpdateFleetDriverRequestDto";
import { CreateFleetVehicleRequestDto } from "./CreateFleetVehicleRequestDto";
import { UpdateFleetVehicleRequestDto } from "./UpdateFleetVehicleRequestDto";
import { AssignFleetDriverVehicleRequestDto } from "./AssignFleetDriverVehicleRequestDto";
import { LinkFleetDriverUserRequestDto } from "./LinkFleetDriverUserRequestDto";
import { AssignFleetToListingRequestDto } from "./AssignFleetToListingRequestDto";
import { AssignFleetToAuctionRequestDto } from "./AssignFleetToAuctionRequestDto";

@Controller("fleet")
@UseGuards(JwtAuthenticationGuard)
export class FleetController {
  public constructor(
    private readonly fleetApplicationService: FleetApplicationService,
    private readonly localeResolutionService: LocaleResolutionService,
  ) {}

  @Get("overview")
  public async getOverview(
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
  ) {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const overview = await this.fleetApplicationService.getOverview(
      authenticatedUser.companyId,
      locale,
    );
    return { message: "OK", overview };
  }

  @Post("drivers")
  public async createDriver(
    @Body() body: CreateFleetDriverRequestDto,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
  ) {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const driver = await this.fleetApplicationService.createDriver(
      authenticatedUser.companyId,
      body,
      locale,
    );
    return { message: "OK", driver };
  }

  @Patch("drivers/:driverId")
  public async updateDriver(
    @Param("driverId") driverId: string,
    @Body() body: UpdateFleetDriverRequestDto,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
  ) {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const driver = await this.fleetApplicationService.updateDriver(
      authenticatedUser.companyId,
      driverId,
      body,
      locale,
    );
    return { message: "OK", driver };
  }

  @Post("drivers/:driverId/unassign")
  public async unassignDriver(
    @Param("driverId") driverId: string,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
  ) {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const driver = await this.fleetApplicationService.clearAssignment(
      authenticatedUser.companyId,
      driverId,
      locale,
    );
    return { message: "OK", driver };
  }

  @Post("vehicles")
  public async createVehicle(
    @Body() body: CreateFleetVehicleRequestDto,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
  ) {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const vehicle = await this.fleetApplicationService.createVehicle(
      authenticatedUser.companyId,
      body,
      locale,
    );
    return { message: "OK", vehicle };
  }

  @Patch("vehicles/:vehicleId")
  public async updateVehicle(
    @Param("vehicleId") vehicleId: string,
    @Body() body: UpdateFleetVehicleRequestDto,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
  ) {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const vehicle = await this.fleetApplicationService.updateVehicle(
      authenticatedUser.companyId,
      vehicleId,
      body,
      locale,
    );
    return { message: "OK", vehicle };
  }

  @Post("drivers/:driverId/link-user")
  public async linkDriverUser(
    @Param("driverId") driverId: string,
    @Body() body: LinkFleetDriverUserRequestDto,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
  ) {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const driver = await this.fleetApplicationService.linkDriverUserAccount(
      authenticatedUser.companyId,
      driverId,
      body,
      locale,
    );
    return { message: "OK", driver };
  }

  @Post("listings/:listingId/assign-fleet")
  public async assignListingFleet(
    @Param("listingId") listingId: string,
    @Body() body: AssignFleetToListingRequestDto,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
  ) {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const result = await this.fleetApplicationService.assignFleetToListing(
      authenticatedUser.companyId,
      listingId,
      body,
      locale,
    );
    return { message: "OK", assignment: result };
  }

  @Post("auctions/:sessionId/assign-fleet")
  public async assignAuctionFleet(
    @Param("sessionId") sessionId: string,
    @Body() body: AssignFleetToAuctionRequestDto,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
  ) {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const result = await this.fleetApplicationService.assignFleetToAuction(
      authenticatedUser.companyId,
      sessionId,
      body,
      locale,
    );
    return { message: "OK", assignment: result };
  }

  @Get("driver-portal/me")
  public async driverPortalMe(
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
  ) {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const portal = await this.fleetApplicationService.getDriverPortal(
      authenticatedUser.userId,
      locale,
    );
    return { message: "OK", portal };
  }

  @Post("assignments")
  public async assign(
    @Body() body: AssignFleetDriverVehicleRequestDto,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
  ) {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const result = await this.fleetApplicationService.assignDriverToVehicle(
      authenticatedUser.companyId,
      body,
      locale,
    );
    return { message: "OK", ...result };
  }
}
