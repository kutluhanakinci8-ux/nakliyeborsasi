import { AuthenticatedApiClient } from "./AuthenticatedApiClient";
import { PublicApiConfiguration } from "./PublicApiConfiguration";

export type TrustScoreRecord = {
  companyId: string;
  scoreValue: number;
  reviewCount: number;
};

export class TrustScoreApiClient {
  public static async fetchSnapshot(
    companyId: string,
  ): Promise<{ snapshot: TrustScoreRecord }> {
    const response = await fetch(
      `${PublicApiConfiguration.resolveBaseUrl()}/trust-scores/companies/${companyId}`,
    );
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(errorBody || "Trust score request failed");
    }
    return response.json() as Promise<{ snapshot: TrustScoreRecord }>;
  }

  public static async submitReview(
    accessToken: string,
    locale: string,
    companyId: string,
    scoreValue: number,
    commentText: string,
  ): Promise<void> {
    await AuthenticatedApiClient.fetchJson(
      accessToken,
      `/trust-scores/companies/${companyId}/reviews?lang=${locale}`,
      {
        method: "POST",
        body: JSON.stringify({ scoreValue, commentText }),
      },
    );
  }
}
