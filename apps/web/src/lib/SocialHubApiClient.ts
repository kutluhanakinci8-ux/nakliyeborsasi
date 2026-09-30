import { PublicApiConfiguration } from "./PublicApiConfiguration";
import type { SocialHubSnapshot } from "./socialHubTypes";

async function socialHubFetch<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(
    `${PublicApiConfiguration.resolveBaseUrl()}/company/social-hub${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Social hub request failed");
  }
  return (await response.json()) as T;
}

export class SocialHubApiClient {
  public static async fetchSnapshot(
    accessToken: string,
  ): Promise<SocialHubSnapshot> {
    const payload = await socialHubFetch<{ hub: SocialHubSnapshot }>(
      accessToken,
      "",
    );
    return payload.hub;
  }

  public static async connectPlatform(
    accessToken: string,
    platformCode: string,
  ): Promise<{ oauth: { message: string }; connection: unknown }> {
    return socialHubFetch(accessToken, `/connections/${platformCode}/connect`, {
      method: "POST",
    });
  }

  public static async disconnectPlatform(
    accessToken: string,
    platformCode: string,
  ): Promise<void> {
    await socialHubFetch(accessToken, `/connections/${platformCode}/disconnect`, {
      method: "POST",
    });
  }

  public static async syncInbox(
    accessToken: string,
    platformCode: string,
  ): Promise<{ sync: { message: string; importedThreadCount: number } }> {
    return socialHubFetch(
      accessToken,
      `/connections/${platformCode}/sync-inbox`,
      { method: "POST" },
    );
  }

  public static async createPost(
    accessToken: string,
    body: { bodyText: string; platformCodes: string[] },
  ): Promise<{ post: { id: string } }> {
    return socialHubFetch(accessToken, "/posts", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  public static async publishPost(
    accessToken: string,
    postId: string,
  ): Promise<{ post: unknown; providerMessage?: string }> {
    return socialHubFetch(accessToken, `/posts/${postId}/publish`, {
      method: "POST",
    });
  }

  public static async createTemplate(
    accessToken: string,
    body: { title: string; bodyText: string },
  ): Promise<void> {
    await socialHubFetch(accessToken, "/templates", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  public static async updateSettings(
    accessToken: string,
    body: Record<string, boolean | undefined>,
  ): Promise<void> {
    await socialHubFetch(accessToken, "/settings", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }
}
