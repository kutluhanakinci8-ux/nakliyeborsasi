import { PublicApiConfiguration } from "./PublicApiConfiguration";

export class AuthApiClient {
  public static async login(
    emailAddress: string,
    password: string,
  ): Promise<{ accessToken: string }> {
    const response = await fetch(
      `${PublicApiConfiguration.resolveBaseUrl()}/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailAddress, password }),
      },
    );
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(errorBody || "Login failed");
    }
    return response.json() as Promise<{ accessToken: string }>;
  }
}
