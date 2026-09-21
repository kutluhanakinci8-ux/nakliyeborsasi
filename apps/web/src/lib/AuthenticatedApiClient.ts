import { PublicApiConfiguration } from "./PublicApiConfiguration";

export class AuthenticatedApiClient {
  public static async fetchJson(
    accessToken: string,
    path: string,
    init: RequestInit = {},
  ): Promise<unknown> {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${accessToken}`);
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const response = await fetch(
      `${PublicApiConfiguration.resolveBaseUrl()}${path}`,
      { ...init, headers },
    );
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(errorBody || `Request failed: ${path}`);
    }
    return response.json();
  }
}
