import { PublicApiConfiguration } from "./PublicApiConfiguration";
import type { IntegrationSearchResponse } from "./IntegrationTypes";

export class IntegrationApiClient {
  public static async fetchExternalOffers(
    accessToken: string,
    locale: string,
    query?: {
      originCountryCode?: string;
      destinationCountryCode?: string;
      limit?: number;
    },
  ): Promise<IntegrationSearchResponse> {
    const params = new URLSearchParams({ lang: locale });
    if (query?.originCountryCode) {
      params.set("originCountryCode", query.originCountryCode);
    }
    if (query?.destinationCountryCode) {
      params.set("destinationCountryCode", query.destinationCountryCode);
    }
    params.set("limit", String(query?.limit ?? 12));

    const response = await fetch(
      `${PublicApiConfiguration.resolveBaseUrl()}/integrations/freight-offers?${params}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(errorBody || "Entegrasyon isteği başarısız");
    }
    return response.json() as Promise<IntegrationSearchResponse>;
  }
}
