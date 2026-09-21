import { PublicApiConfiguration } from "./PublicApiConfiguration";

export class MarketplaceApiClient {
  public static async fetchListings(
    accessToken: string,
    locale: string,
  ): Promise<unknown> {
    const response = await fetch(
      `${PublicApiConfiguration.resolveBaseUrl()}/marketplace/listings?lang=${locale}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(errorBody || "Marketplace request failed");
    }
    return response.json();
  }
}
