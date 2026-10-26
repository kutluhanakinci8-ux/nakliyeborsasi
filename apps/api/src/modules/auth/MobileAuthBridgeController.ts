import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { MobileAuthBridgeService } from "./MobileAuthBridgeService";

type TokenBody = {
  grant_type?: string;
  username?: string;
  password?: string;
};

@Controller("auth/mobile")
export class MobileAuthBridgeController {
  public constructor(
    private readonly mobileAuthBridgeService: MobileAuthBridgeService,
  ) {}

  @Get(".well-known/openid-configuration")
  public getOpenIdConfiguration(): Record<string, unknown> {
    const config = this.mobileAuthBridgeService.openIdConfiguration();
    if (!config) {
      throw new NotFoundException("Mobile OAuth bridge not configured");
    }
    return config;
  }

  @Post("token")
  public async token(
    @Req() request: Request,
    @Body() body: TokenBody,
  ): Promise<{
    access_token: string;
    token_type: "Bearer";
    expires_in: number;
  }> {
    if (!this.mobileAuthBridgeService.isBridgeEnabled()) {
      throw new NotFoundException("Mobile OAuth bridge not configured");
    }
    const grantType =
      body.grant_type ??
      (typeof request.body?.grant_type === "string"
        ? request.body.grant_type
        : undefined);
    const username =
      body.username ??
      (typeof request.body?.username === "string"
        ? request.body.username
        : undefined);
    const password =
      body.password ??
      (typeof request.body?.password === "string"
        ? request.body.password
        : undefined);
    if (grantType !== "password") {
      throw new UnauthorizedException("unsupported_grant_type");
    }
    if (!username?.trim() || !password) {
      throw new UnauthorizedException("invalid_request");
    }
    return this.mobileAuthBridgeService.issuePasswordGrantToken(
      username.trim(),
      password,
      request,
    );
  }
}
