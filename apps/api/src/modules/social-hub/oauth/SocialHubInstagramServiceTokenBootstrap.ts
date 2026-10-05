import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { SocialHubOAuthApplicationService } from "./SocialHubOAuthApplicationService";

@Injectable()
export class SocialHubInstagramServiceTokenBootstrap implements OnModuleInit {
  private readonly logger = new Logger(
    SocialHubInstagramServiceTokenBootstrap.name,
  );

  public constructor(
    private readonly oauthApplicationService: SocialHubOAuthApplicationService,
  ) {}

  public async onModuleInit(): Promise<void> {
    try {
      await this.oauthApplicationService.bootstrapInstagramServiceAccessTokenFromEnv();
    } catch (error) {
      this.logger.warn(
        `Instagram service token bootstrap failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
