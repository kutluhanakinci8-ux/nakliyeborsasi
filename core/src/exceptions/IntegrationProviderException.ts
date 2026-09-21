import { IntegrationProviderCode } from "../constants/IntegrationProviderCode";
import { PlatformException } from "./PlatformException";

export class IntegrationProviderException extends PlatformException {
  public readonly providerCode: IntegrationProviderCode;

  public constructor(
    providerCode: IntegrationProviderCode,
    message: string,
    httpStatus: number = 502,
  ) {
    super("INTEGRATION_PROVIDER_ERROR", message, httpStatus);
    this.providerCode = providerCode;
  }
}
