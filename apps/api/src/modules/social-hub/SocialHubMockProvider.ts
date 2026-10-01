import { createHmac } from "crypto";
import { parseTikTokWebhookInbound } from "./oauth/socialHubTikTokWebhookParser";
import { verifyTikTokWebhookSignature } from "./oauth/socialHubTikTokWebhookSignature";
import {
  expandYouTubePubSubWebhookBody,
  parseYouTubeWebhookInbound,
} from "./oauth/socialHubYouTubeWebhookParser";
import { renderSocialHubTemplate } from "./socialHubTemplateRender";

/** CI / yerel fixture: prod Graph veya webhook secret gerektirmez. */
export class SocialHubMockProvider {
  public static tikTokInboundWebhookFixture(): Record<string, unknown> {
    return {
      content: {
        to_user_open_id: "biz-open-123",
        from_user_open_id: "user-abc",
        conversation_id: "conv-1",
        text: "Merhaba mock TikTok",
        message_id: "msg-mock-1",
      },
    };
  }

  public static youTubePubSubPushFixture(): Record<string, unknown> {
    const inner = {
      channelId: "UCmockchannel",
      text: "Pub/Sub mock mesaj",
      conversation_id: "thread-mock",
      authorChannelId: "UCviewer",
    };
    return {
      message: {
        data: Buffer.from(JSON.stringify(inner), "utf8").toString("base64"),
      },
    };
  }

  public static runWebhookContractSelfTest(): void {
    const tikTokBody = SocialHubMockProvider.tikTokInboundWebhookFixture();
    const parsedTt = parseTikTokWebhookInbound(tikTokBody);
    if (!parsedTt || parsedTt.bodyText !== "Merhaba mock TikTok") {
      throw new Error("SocialHubMockProvider: TikTok parse fixture failed");
    }
    const secret = "mock-webhook-secret";
    const raw = Buffer.from(JSON.stringify({ event: "ping" }), "utf8");
    const sig = createHmac("sha256", secret).update(raw).digest("hex");
    if (
      !verifyTikTokWebhookSignature({
        signatureHeader: `sha256=${sig}`,
        rawBody: raw,
        secret,
      })
    ) {
      throw new Error("SocialHubMockProvider: TikTok signature fixture failed");
    }

    const ytBody = SocialHubMockProvider.youTubePubSubPushFixture();
    const expanded = expandYouTubePubSubWebhookBody(ytBody);
    const parsedYt = parseYouTubeWebhookInbound(expanded);
    if (!parsedYt || !parsedYt.bodyText.includes("Pub/Sub mock")) {
      throw new Error("SocialHubMockProvider: YouTube Pub/Sub fixture failed");
    }

    const rendered = renderSocialHubTemplate("Selam {{companyName}}", {
      companyName: "Mock A.Ş.",
    });
    if (rendered !== "Selam Mock A.Ş.") {
      throw new Error("SocialHubMockProvider: template render fixture failed");
    }
  }
}
