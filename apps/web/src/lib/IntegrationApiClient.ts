import { PublicApiConfiguration } from "./PublicApiConfiguration";

export class IntegrationApiClient {
  public static async fetchExternalOffers(
    accessToken: string,
    locale: string,
  ): Promise<unknown> {
    const response = await fetch(
      `${PublicApiConfiguration.resolveBaseUrl()}/integrations/freight-offers?lang=${locale}&limit=10`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    return response.json();
  }
}
