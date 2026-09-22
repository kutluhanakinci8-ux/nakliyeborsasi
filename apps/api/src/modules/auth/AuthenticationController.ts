import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { UserCredentialAuthenticationService } from "./UserCredentialAuthenticationService";
import { RegisterCompanyUserRequestDto } from "./RegisterCompanyUserRequestDto";
import { LoginUserRequestDto } from "./LoginUserRequestDto";
import { EnrichCompanyWebsiteRequestDto } from "./EnrichCompanyWebsiteRequestDto";
import { CompanyWebsiteEnrichmentService } from "./CompanyWebsiteEnrichmentService";
import { CompanyWebsiteEnrichmentResult } from "./CompanyWebsiteEnrichmentResult";
import { JwtTokenIssuingService } from "./JwtTokenIssuingService";
import { JwtAuthenticationGuard } from "./JwtAuthenticationGuard";
import { AuthenticatedUserParam } from "./AuthenticatedUserParam";

@Controller("auth")
export class AuthenticationController {
  public constructor(
    private readonly userCredentialAuthenticationService: UserCredentialAuthenticationService,
    private readonly jwtTokenIssuingService: JwtTokenIssuingService,
    private readonly companyWebsiteEnrichmentService: CompanyWebsiteEnrichmentService,
  ) {}

  @Post("register")
  public async register(
    @Body() body: RegisterCompanyUserRequestDto,
  ): Promise<{ accessToken: string }> {
    const authenticatedUser =
      await this.userCredentialAuthenticationService.registerCompanyOwner(body);
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

  @Post("login")
  public async login(
    @Body() body: LoginUserRequestDto,
  ): Promise<{ accessToken: string }> {
    const authenticatedUser =
      await this.userCredentialAuthenticationService.authenticateCredentials(
        body,
      );
    return {
      accessToken:
        this.jwtTokenIssuingService.issueAccessToken(authenticatedUser),
    };
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
