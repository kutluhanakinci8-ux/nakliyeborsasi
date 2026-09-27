import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import type { Request } from "express";
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { MailProductTotpPolicyGuard } from "./MailProductTotpPolicyGuard";
import { AuthenticatedUserParam } from "../auth/AuthenticatedUserParam";
import { MailJmapBridgeService } from "./MailJmapBridgeService";
import { assertMailConsoleAccess } from "./MailCompanyRoleAuthorization";

@Controller("company/mail-jmap")
@UseGuards(JwtAuthenticationGuard, MailProductTotpPolicyGuard)
export class CompanyMailJmapController {
  public constructor(private readonly mailJmapBridgeService: MailJmapBridgeService) {}

  @Get("session")
  public async session(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Req() request: Request,
  ) {
    assertMailConsoleAccess(user);
    const apiUrl = this.resolveJmapApiUrl(request);
    return this.mailJmapBridgeService.buildSession({
      organizationId: user.companyId,
      username: user.emailAddress,
      apiUrl,
    });
  }

  @Post()
  public async invoke(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body()
    body: {
      using?: string[];
      methodCalls?: [string, Record<string, unknown>, string][];
    },
  ) {
    assertMailConsoleAccess(user);
    return await this.mailJmapBridgeService.processMethodCalls(
      user.companyId,
      body,
    );
  }

  private resolveJmapApiUrl(request: Request): string {
    const forwardedProto = request.headers["x-forwarded-proto"];
    const protocol =
      typeof forwardedProto === "string"
        ? forwardedProto.split(",")[0]?.trim()
        : request.protocol;
    const host = request.get("host") ?? "localhost";
    return `${protocol}://${host}/api/v1/company/mail-jmap`;
  }
}
