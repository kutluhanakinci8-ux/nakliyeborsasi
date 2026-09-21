import { PublicApiConfiguration } from "./PublicApiConfiguration";

export type AuthSessionRecord = {
  userId: string;
  companyId: string;
  emailAddress: string;
  roleCodes: string[];
};

export class SessionApiClient {
  public static async fetchSession(
    accessToken: string,
  ): Promise<AuthSessionRecord> {
    const response = await fetch(
      `${PublicApiConfiguration.resolveBaseUrl()}/auth/session`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    if (!response.ok) {
      throw new Error("Session request failed");
    }
    const payload = (await response.json()) as { session: AuthSessionRecord };
    return payload.session;
  }
}
