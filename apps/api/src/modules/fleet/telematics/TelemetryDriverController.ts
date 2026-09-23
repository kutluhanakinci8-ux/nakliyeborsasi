import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { JwtAuthenticationGuard } from "../../auth/JwtAuthenticationGuard";
import { AuthenticatedUserParam } from "../../auth/AuthenticatedUserParam";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { TelemetryApplicationService } from "./TelemetryApplicationService";
import { EnrollTelemetryDeviceRequestDto } from "./EnrollTelemetryDeviceRequestDto";

@Controller("fleet/telematics/driver")
@UseGuards(JwtAuthenticationGuard)
export class TelemetryDriverController {
  public constructor(
    private readonly telemetryApplicationService: TelemetryApplicationService,
  ) {}

  @Get("status")
  public async status(@AuthenticatedUserParam() user: AuthenticatedUserContext) {
    const snapshot = await this.telemetryApplicationService.getDriverStatus(
      user.userId,
    );
    return { message: "OK", telematics: snapshot };
  }

  @Post("consent")
  public async grantConsent(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Req() request: Request,
  ) {
    const snapshot = await this.telemetryApplicationService.grantConsent(
      user.userId,
      request.ip,
    );
    return { message: "OK", telematics: snapshot };
  }

  @Post("consent/revoke")
  public async revokeConsent(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Req() request: Request,
  ) {
    const snapshot = await this.telemetryApplicationService.revokeConsent(
      user.userId,
      request.ip,
    );
    return { message: "OK", telematics: snapshot };
  }

  @Post("devices/enroll")
  public async enroll(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: EnrollTelemetryDeviceRequestDto,
    @Req() request: Request,
  ) {
    const enrollment = await this.telemetryApplicationService.enrollDevice(
      user.userId,
      body,
      request.ip,
    );
    return { message: "OK", enrollment };
  }
}
