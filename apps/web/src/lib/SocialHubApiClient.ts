import { PublicApiConfiguration } from "./PublicApiConfiguration";
import type {
  SocialHubAnalytics,
  SocialHubAuditEntry,
  SocialHubHealth,
  SocialHubOutboundDelivery,
  SocialHubSnapshot,
  SocialHubTeamMember,
} from "./socialHubTypes";
import { normalizeSocialHubSnapshot } from "./normalizeSocialHubSnapshot";

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
  public static async fetchAnalytics(
    accessToken: string,
  ): Promise<SocialHubAnalytics> {
    const payload = await socialHubFetch<{ analytics: SocialHubAnalytics }>(
      accessToken,
      "/analytics",
    );
    return payload.analytics;
  }

  public static async fetchSnapshot(
    accessToken: string,
  ): Promise<SocialHubSnapshot> {
    const payload = await socialHubFetch<unknown>(accessToken, "");
    return normalizeSocialHubSnapshot(payload);
  }

  public static async fetchHealth(
    accessToken: string,
  ): Promise<SocialHubHealth> {
    const payload = await socialHubFetch<{ health: SocialHubHealth }>(
      accessToken,
      "/health",
    );
    return payload.health;
  }

  public static buildDeliveryExportUrl(params?: {
    threadId?: string;
    platformCode?: string;
    status?: "ok" | "failed";
    since?: string;
    until?: string;
    limit?: number;
  }): string {
    const query = new URLSearchParams();
    if (params?.threadId) {
      query.set("threadId", params.threadId);
    }
    if (params?.platformCode) {
      query.set("platformCode", params.platformCode);
    }
    if (params?.status) {
      query.set("status", params.status);
    }
    if (params?.since) {
      query.set("since", params.since);
    }
    if (params?.until) {
      query.set("until", params.until);
    }
    if (params?.limit) {
      query.set("limit", String(params.limit));
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return `${PublicApiConfiguration.resolveBaseUrl()}/company/social-hub/delivery-log/export${suffix}`;
  }

  public static async fetchDeliveryLog(
    accessToken: string,
    params?: {
      threadId?: string;
      limit?: number;
      platformCode?: string;
      status?: "ok" | "failed";
      since?: string;
      until?: string;
    },
  ): Promise<SocialHubOutboundDelivery[]> {
    const query = new URLSearchParams();
    if (params?.threadId) {
      query.set("threadId", params.threadId);
    }
    if (params?.limit) {
      query.set("limit", String(params.limit));
    }
    if (params?.platformCode) {
      query.set("platformCode", params.platformCode);
    }
    if (params?.status) {
      query.set("status", params.status);
    }
    if (params?.since) {
      query.set("since", params.since);
    }
    if (params?.until) {
      query.set("until", params.until);
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const payload = await socialHubFetch<{
      deliveries: SocialHubOutboundDelivery[];
    }>(accessToken, `/delivery-log${suffix}`);
    return payload.deliveries;
  }

  public static async downloadDeliveryExport(
    accessToken: string,
    params?: {
      threadId?: string;
      platformCode?: string;
      status?: "ok" | "failed";
      since?: string;
      until?: string;
      limit?: number;
    },
  ): Promise<void> {
    const url = SocialHubApiClient.buildDeliveryExportUrl(params);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new Error("CSV export failed");
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = "social-hub-deliveries.csv";
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  }

  public static async refreshConnectionToken(
    accessToken: string,
    platformCode: string,
  ): Promise<{ refresh: { refreshed: boolean; message: string } }> {
    return socialHubFetch(
      accessToken,
      `/connections/${platformCode}/refresh-token`,
      { method: "POST" },
    );
  }

  public static async connectPlatform(
    accessToken: string,
    platformCode: string,
  ): Promise<{
    oauth: {
      message: string;
      authorizationUrl?: string | null;
      implementationStatus?: string;
    };
    connection: unknown;
  }> {
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

  public static async seedDemoInbox(
    accessToken: string,
  ): Promise<{ createdThreadIds: string[] }> {
    return socialHubFetch(accessToken, "/inbox/seed-demo", { method: "POST" });
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

  public static async updatePost(
    accessToken: string,
    postId: string,
    body: {
      bodyText?: string;
      platformCodes?: string[];
      scheduledAt?: string | null;
    },
  ): Promise<{ post: unknown }> {
    return socialHubFetch(accessToken, `/posts/${postId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  public static async deletePost(
    accessToken: string,
    postId: string,
  ): Promise<void> {
    await socialHubFetch(accessToken, `/posts/${postId}`, { method: "DELETE" });
  }

  public static async submitPostForApproval(
    accessToken: string,
    postId: string,
  ): Promise<{ post: unknown }> {
    return socialHubFetch(accessToken, `/posts/${postId}/submit-approval`, {
      method: "POST",
    });
  }

  public static async approvePost(
    accessToken: string,
    postId: string,
  ): Promise<{ post: unknown }> {
    return socialHubFetch(accessToken, `/posts/${postId}/approve`, {
      method: "POST",
    });
  }

  public static async cancelPost(
    accessToken: string,
    postId: string,
  ): Promise<{ post: unknown }> {
    return socialHubFetch(accessToken, `/posts/${postId}/cancel`, {
      method: "POST",
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
    body: Record<string, boolean | string | number | null | undefined>,
  ): Promise<void> {
    await socialHubFetch(accessToken, "/settings", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  public static async fetchTeam(accessToken: string): Promise<{
    members: SocialHubTeamMember[];
    assignableRoleCodes: string[];
    integrationsPath: string;
  }> {
    return socialHubFetch(accessToken, "/team");
  }

  public static async updateMemberRole(
    accessToken: string,
    userId: string,
    roleCode: string,
  ): Promise<void> {
    await socialHubFetch(accessToken, `/team/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ roleCode }),
    });
  }

  public static async fetchAuditLog(accessToken: string): Promise<{
    entries: SocialHubAuditEntry[];
  }> {
    return socialHubFetch(accessToken, "/audit-log");
  }
}
