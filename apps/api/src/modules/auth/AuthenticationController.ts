import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { UserCredentialAuthenticationService } from "./UserCredentialAuthenticationService";
import { RegisterCompanyUserRequestDto } from "./RegisterCompanyUserRequestDto";
import { LoginUserRequestDto } from "./LoginUserRequestDto";
import { EnrichCompanyWebsiteRequestDto } from "./EnrichCompanyWebsiteRequestDto";
import { CompanyWebsiteEnrichmentService } from "./CompanyWebsiteEnrichmentService";
import { CompanyWebsiteEnrichmentResult } from "./CompanyWebsiteEnrichmentResult";
import { EnrichInstagramStatsRequestDto } from "./EnrichInstagramStatsRequestDto";
import { InstagramPublicStatsService } from "./InstagramPublicStatsService";
import { InstagramPublicStatsResult } from "./InstagramPublicStatsResult";
import { JwtTokenIssuingService } from "./JwtTokenIssuingService";
import { JwtAuthenticationGuard } from "./JwtAuthenticationGuard";
import { AuthenticatedUserParam } from "./AuthenticatedUserParam";
import { AuthNotificationService } from "../notification/AuthNotificationService";
import { authRequestContextFromHttp } from "../notification/AuthRequestContext";
import { EmailSecurityTokenService } from "../notification/EmailSecurityTokenService";
import { RequestPasswordResetDto } from "../notification/RequestPasswordResetDto";
import { ResetPasswordDto } from "../notification/ResetPasswordDto";
import { VerifyEmailQueryDto } from "../notification/VerifyEmailQueryDto";
import { UserTotpService } from "./UserTotpService";
import { UserWebAuthnService } from "./UserWebAuthnService";
import {
  CompleteTotpLoginDto,
  ConfirmTotpSetupDto,
  DisableTotpDto,
} from "./AuthTotpRequestDto";
import {
  WebAuthnAuthenticationVerifyDto,
  WebAuthnRegisterOptionsDto,
  WebAuthnRegistrationVerifyDto,
} from "./AuthWebAuthnRequestDto";
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/types";
import { MobileAuthConfigService } from "./MobileAuthConfigService";

@Controller("auth")
export class AuthenticationController {
  public constructor(
    private readonly userCredentialAuthenticationService: UserCredentialAuthenticationService,
    private readonly jwtTokenIssuingService: JwtTokenIssuingService,
    private readonly companyWebsiteEnrichmentService: CompanyWebsiteEnrichmentService,
    private readonly instagramPublicStatsService: InstagramPublicStatsService,
    private readonly authNotificationService: AuthNotificationService,
    private readonly emailSecurityTokenService: EmailSecurityTokenService,
    private readonly userTotpService: UserTotpService,
    private readonly userWebAuthnService: UserWebAuthnService,
    private readonly mobileAuthConfigService: MobileAuthConfigService,
  ) {}

  @Get("mobile/config")
  public getMobileAuthConfig(): ReturnType<MobileAuthConfigService["getConfig"]> {
    return this.mobileAuthConfigService.getConfig();
  }

  private resolveRequestOrigin(request: Request): string {
    const forwardedProto = request.headers["x-forwarded-proto"];
    const protocol =
      typeof forwardedProto === "string"
        ? forwardedProto.split(",")[0]?.trim()
        : request.protocol;
    const host = request.get("host") ?? "localhost";
    return `${protocol}://${host}`;
  }

  @Post("register")
  public async register(
    @Body() body: RegisterCompanyUserRequestDto,
    @Req() request: Request,
  ): Promise<{ accessToken: string }> {
    const authenticatedUser =
      await this.userCredentialAuthenticationService.registerCompanyOwner(body);
    const http = authRequestContextFromHttp(
      request.ip,
      request.headers["x-forwarded-for"]?.toString(),
      request.headers["user-agent"],
    );
    await this.authNotificationService.afterRegistration(
      authenticatedUser,
      http,
    );
    return {
      accessToken:
        this.jwtTokenIssuingService.issueAccessToken(authenticatedUser),
    };
  }

  @Post("enrich-company-website")
  public async enrichCompanyWebsite(
    @Body() body: EnrichCompanyWebsiteRequestDto,
  ): Promise<{ enrichment: CompanyWebsiteEnrichmentResult }> {
    const enrichment =
      await this.companyWebsiteEnrichmentService.enrichFromWebsite(
        body.websiteUrl,
      );
    return { enrichment };
  }

  @Post("enrich-instagram-stats")
  public async enrichInstagramStats(
    @Body() body: EnrichInstagramStatsRequestDto,
  ): Promise<{ stats: InstagramPublicStatsResult }> {
    const stats = await this.instagramPublicStatsService.fetchFromProfileUrl(
      body.instagramUrl,
    );
    return { stats };
  }

  @Get("instagram-graph-status")
  public getInstagramGraphStatus(): {
    connection: ReturnType<
      InstagramPublicStatsService["getGraphConnectionStatus"]
    >;
  } {
    return {
      connection: this.instagramPublicStatsService.getGraphConnectionStatus(),
    };
  }

  @Post("login")
  public async login(
    @Body() body: LoginUserRequestDto,
    @Req() request: Request,
  ): Promise<{ accessToken: string } | { requiresTotp: true; challengeToken: string }> {
    const authenticatedUser =
      await this.userCredentialAuthenticationService.authenticateCredentials(
        body,
      );
    const totpEnabled = await this.userTotpService.isEnabled(
      authenticatedUser.userId,
    );
    if (totpEnabled) {
      return {
        requiresTotp: true,
        challengeToken: this.jwtTokenIssuingService.issueTotpLoginChallengeToken(
          authenticatedUser.userId,
        ),
      };
    }
    const http = authRequestContextFromHttp(
      request.ip,
      request.headers["x-forwarded-for"]?.toString(),
      request.headers["user-agent"],
    );
    await this.authNotificationService.afterLogin(authenticatedUser, http);
    return {
      accessToken:
        this.jwtTokenIssuingService.issueAccessToken(authenticatedUser),
    };
  }

  @Post("login/totp")
  public async completeTotpLogin(
    @Body() body: CompleteTotpLoginDto,
    @Req() request: Request,
  ): Promise<{ accessToken: string }> {
    let userId: string;
    try {
      userId = this.jwtTokenIssuingService.verifyTotpLoginChallengeToken(
        body.challengeToken,
      );
    } catch {
      throw new UnauthorizedException("Oturum doğrulaması süresi doldu.");
    }
    const valid = await this.userTotpService.verifyForUser(userId, body.code);
    if (!valid) {
      throw new UnauthorizedException("Doğrulama kodu geçersiz.");
    }
    const authenticatedUser =
      await this.userCredentialAuthenticationService.resolveAuthenticatedUserById(
        userId,
      );
    const http = authRequestContextFromHttp(
      request.ip,
      request.headers["x-forwarded-for"]?.toString(),
      request.headers["user-agent"],
    );
    await this.authNotificationService.afterLogin(authenticatedUser, http);
    return {
      accessToken:
        this.jwtTokenIssuingService.issueAccessToken(authenticatedUser),
    };
  }

  @Get("totp/status")
  @UseGuards(JwtAuthenticationGuard)
  public async totpStatus(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
  ) {
    return {
      status: await this.userTotpService.getStatus(user.userId),
    };
  }

  @Post("totp/setup")
  @UseGuards(JwtAuthenticationGuard)
  public async totpSetup(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
  ) {
    const setup = await this.userTotpService.beginSetup(
      user.userId,
      user.emailAddress,
    );
    return { message: "OK", setup };
  }

  @Post("totp/confirm")
  @UseGuards(JwtAuthenticationGuard)
  public async totpConfirm(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: ConfirmTotpSetupDto,
  ) {
    await this.userTotpService.confirmSetup(user.userId, body.code);
    return { message: "OK", enabled: true };
  }

  @Post("totp/disable")
  @UseGuards(JwtAuthenticationGuard)
  public async totpDisable(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: DisableTotpDto,
  ) {
    await this.userTotpService.disable(user.userId, {
      password: body.password,
      code: body.code,
    });
    return { message: "OK", enabled: false };
  }

  @Post("request-password-reset")
  public async requestPasswordReset(
    @Body() body: RequestPasswordResetDto,
  ): Promise<{ message: string }> {
    await this.emailSecurityTokenService.requestPasswordReset(body.emailAddress);
    return { message: "OK" };
  }

  @Post("reset-password")
  public async resetPassword(@Body() body: ResetPasswordDto): Promise<{ message: string }> {
    await this.emailSecurityTokenService.resetPassword(
      body.token,
      body.newPassword,
    );
    return { message: "OK" };
  }

  @Get("verify-email")
  public async verifyEmail(@Query() query: VerifyEmailQueryDto): Promise<{ message: string }> {
    await this.emailSecurityTokenService.verifyEmail(query.token);
    return { message: "OK" };
  }

  @Post("request-email-verification")
  @UseGuards(JwtAuthenticationGuard)
  public async requestEmailVerification(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
  ): Promise<{ message: string }> {
    await this.emailSecurityTokenService.requestEmailVerification(user.userId);
    return { message: "OK" };
  }

  @Get("webauthn/credentials")
  @UseGuards(JwtAuthenticationGuard)
  public async listWebAuthnCredentials(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
  ) {
    const credentials = await this.userWebAuthnService.listCredentials(
      user.userId,
    );
    const hasPasskeys = credentials.length > 0;
    return { credentials, hasPasskeys };
  }

  @Post("webauthn/register/options")
  @UseGuards(JwtAuthenticationGuard)
  public async webAuthnRegisterOptions(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Req() request: Request,
    @Body() body: WebAuthnRegisterOptionsDto,
  ) {
    const origin = this.resolveRequestOrigin(request);
    return await this.userWebAuthnService.createRegistrationOptions(
      user.userId,
      origin,
      body.deviceName,
    );
  }

  @Post("webauthn/register/verify")
  @UseGuards(JwtAuthenticationGuard)
  public async webAuthnRegisterVerify(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Req() request: Request,
    @Body() body: WebAuthnRegistrationVerifyDto,
  ) {
    const origin = this.resolveRequestOrigin(request);
    return await this.userWebAuthnService.verifyRegistration(
      user.userId,
      origin,
      body.response as unknown as RegistrationResponseJSON,
      body.deviceName,
    );
  }

  @Post("webauthn/authenticate/options")
  @UseGuards(JwtAuthenticationGuard)
  public async webAuthnAuthOptions(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Req() request: Request,
  ) {
    const origin = this.resolveRequestOrigin(request);
    const options = await this.userWebAuthnService.createAuthenticationOptions(
      user.userId,
      origin,
    );
    return options;
  }

  @Post("webauthn/authenticate/verify")
  @UseGuards(JwtAuthenticationGuard)
  public async webAuthnAuthVerify(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Req() request: Request,
    @Body() body: WebAuthnAuthenticationVerifyDto,
  ) {
    const origin = this.resolveRequestOrigin(request);
    return await this.userWebAuthnService.verifyAuthentication(
      user.userId,
      origin,
      body.response as unknown as AuthenticationResponseJSON,
    );
  }

  @Post("webauthn/credentials/:credentialId/delete")
  @UseGuards(JwtAuthenticationGuard)
  public async deleteWebAuthnCredential(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("credentialId") credentialId: string,
  ) {
    if (!credentialId?.trim()) {
      throw new UnauthorizedException();
    }
    await this.userWebAuthnService.deleteCredential(user.userId, credentialId);
    return { ok: true };
  }

  @Get("session")
  @UseGuards(JwtAuthenticationGuard)
  public async getSession(
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
  ): Promise<{ session: AuthenticatedUserContext }> {
    const session =
      await this.userCredentialAuthenticationService.resolveSessionContext(
        authenticatedUser,
      );
    return { session };
  }
}
