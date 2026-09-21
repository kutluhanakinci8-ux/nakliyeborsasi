import { Body, Controller, Post } from "@nestjs/common";
import { UserCredentialAuthenticationService } from "./UserCredentialAuthenticationService";
import { RegisterCompanyUserRequestDto } from "./RegisterCompanyUserRequestDto";
import { LoginUserRequestDto } from "./LoginUserRequestDto";
import { JwtTokenIssuingService } from "./JwtTokenIssuingService";

@Controller("auth")
export class AuthenticationController {
  public constructor(
    private readonly userCredentialAuthenticationService: UserCredentialAuthenticationService,
    private readonly jwtTokenIssuingService: JwtTokenIssuingService,
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
}
