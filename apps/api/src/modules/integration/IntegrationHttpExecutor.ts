import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { IntegrationConfigurationService } from "./IntegrationConfigurationService";
import { IntegrationProviderException } from "@nakliyeborsasi/core";
import { IntegrationProviderCode } from "@nakliyeborsasi/core";

@Injectable()
export class IntegrationHttpExecutor {
  public constructor(
    private readonly httpService: HttpService,
    private readonly integrationConfigurationService: IntegrationConfigurationService,
  ) {}

  public async executeGetRequest<TResponse>(
    providerCode: IntegrationProviderCode,
    url: string,
  ): Promise<TResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<TResponse>(url, {
          timeout:
            this.integrationConfigurationService.getHttpTimeoutMilliseconds(),
        }),
      );
      return response.data;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown HTTP error";
      throw new IntegrationProviderException(providerCode, message);
    }
  }
}
