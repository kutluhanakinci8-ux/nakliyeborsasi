import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class SocialHubLinkedInGraphService {
  private readonly logger = new Logger(SocialHubLinkedInGraphService.name);

  public async resolveAuthorUrn(accessToken: string): Promise<string | null> {
    try {
      const response = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = (await response.json()) as { sub?: string };
      if (!response.ok || !payload.sub) {
        return null;
      }
      return `urn:li:person:${payload.sub}`;
    } catch (error) {
      this.logger.warn(
        `LinkedIn userinfo failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  public async resolvePrimaryOrganizationUrn(
    accessToken: string,
  ): Promise<string | null> {
    try {
      const url = new URL("https://api.linkedin.com/v2/organizationAcls");
      url.searchParams.set("q", "roleAssignee");
      url.searchParams.set("role", "ADMINISTRATOR");
      url.searchParams.set("state", "APPROVED");
      url.searchParams.set("count", "10");
      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
      });
      const payload = (await response.json()) as {
        elements?: Array<{ organizationalTarget?: string }>;
        message?: string;
      };
      if (!response.ok || !payload.elements?.length) {
        this.logger.warn(
          `LinkedIn organizationAcls failed: ${payload.message ?? response.status}`,
        );
        return null;
      }
      const urn = payload.elements.find((row) =>
        row.organizationalTarget?.startsWith("urn:li:organization:"),
      )?.organizationalTarget;
      return urn ?? null;
    } catch (error) {
      this.logger.warn(
        `LinkedIn organizationAcls error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  public async publishTextPost(params: {
    accessToken: string;
    authorUrn: string;
    bodyText: string;
  }): Promise<{ externalPostId: string | null; message: string }> {
    const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: params.authorUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text: params.bodyText },
            shareMediaCategory: "NONE",
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      }),
    });
    const payload = (await response.json()) as {
      id?: string;
      message?: string;
      status?: number;
    };
    if (!response.ok) {
      return {
        externalPostId: null,
        message: payload.message ?? "LinkedIn yayını başarısız.",
      };
    }
    return {
      externalPostId: payload.id ?? null,
      message: "LinkedIn gönderisi yayınlandı.",
    };
  }
}
