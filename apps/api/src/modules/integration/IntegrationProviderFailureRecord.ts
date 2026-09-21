import { IntegrationProviderCode } from "@nakliyeborsasi/core";

export class IntegrationProviderFailureRecord {
  public readonly providerCode: IntegrationProviderCode;

  public readonly message: string;

  public constructor(
    providerCode: IntegrationProviderCode,
    message: string,
  ) {
    this.providerCode = providerCode;
    this.message = message;
  }
}
