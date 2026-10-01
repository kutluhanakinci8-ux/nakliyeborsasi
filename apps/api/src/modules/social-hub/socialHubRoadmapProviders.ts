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
  implementationStatus: "roadmap";
  roadmapNote: string;
  capabilities: SocialHubProviderCapabilities;
  roadmapInterested?: boolean;
  oauthEnvConfigured?: boolean;
  roadmapConnectionStatusCode?: string | null;
};

export const SOCIAL_HUB_ROADMAP_PROVIDERS: SocialHubRoadmapProvider[] = [
  {
    platformCode: "TIKTOK",
    label: "TikTok",
    implementationStatus: "roadmap",
    roadmapNote:
      "İşletme mesajları ve kısa video yayını — OAuth entegrasyonu yol haritasında.",
    capabilities: EMPTY_CAPS,
  },
  {
    platformCode: "YOUTUBE",
    label: "YouTube",
    implementationStatus: "roadmap",
    roadmapNote:
      "Shorts ve kanal mesajları — API bağlantısı planlanan sırada (TikTok sonrası).",
    capabilities: EMPTY_CAPS,
  },
];
