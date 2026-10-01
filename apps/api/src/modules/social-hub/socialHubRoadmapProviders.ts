import type { SocialHubProviderCapabilities } from "./socialHubProviderCapabilities";

const EMPTY_CAPS: SocialHubProviderCapabilities = {
  oauthConnect: false,
  inboxWebhook: false,
  inboxHistorySync: false,
  outboundMessaging: false,
  feedPublish: false,
};

export type SocialHubRoadmapProvider = {
  platformCode: string;
  label: string;
  implementationStatus: "roadmap" | "ready";
  roadmapNote: string;
  capabilities: SocialHubProviderCapabilities;
  roadmapInterested?: boolean;
  oauthEnvConfigured?: boolean;
  oauthImplementationStatus?: "ready" | "pending";
  isRoadmapBeta?: boolean;
  roadmapConnectionStatusCode?: string | null;
  roadmapHasRefreshToken?: boolean;
};

export const SOCIAL_HUB_ROADMAP_PROVIDERS: SocialHubRoadmapProvider[] = [
  {
    platformCode: "TIKTOK",
    label: "TikTok",
    implementationStatus: "roadmap",
    roadmapNote:
      "Prod OAuth yolu — gelen webhook Mesajlar köprüsü; giden mesaj deploy’da SOCIAL_TIKTOK_OUTBOUND_ENABLED=1 ile açılır.",
    capabilities: EMPTY_CAPS,
  },
  {
    platformCode: "YOUTUBE",
    label: "YouTube",
    implementationStatus: "roadmap",
    roadmapNote:
      "Beta OAuth — Pub/Sub webhook Mesajlar köprüsü; giden mesaj SOCIAL_YOUTUBE_OUTBOUND_ENABLED ile.",
    capabilities: EMPTY_CAPS,
  },
];
