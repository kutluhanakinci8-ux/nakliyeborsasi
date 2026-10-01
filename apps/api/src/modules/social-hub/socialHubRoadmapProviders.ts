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
  implementationStatus: "roadmap" | "ready" | "pending";
  roadmapNote: string;
  capabilities: SocialHubProviderCapabilities;
  isPendingSkeleton?: boolean;
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
      "Prod OAuth yolu — Pub/Sub push webhook Mesajlar köprüsü; giden mesaj deploy’da SOCIAL_YOUTUBE_OUTBOUND_ENABLED=1 ile açılır.",
    capabilities: EMPTY_CAPS,
  },
  {
    platformCode: "X",
    label: "X (Twitter)",
    implementationStatus: "pending",
    isPendingSkeleton: true,
    roadmapNote:
      "Pending provider iskeleti — OAuth ve gelen kutusu sonraki sprintte. Şimdilik öncelik bildirimi toplanır.",
    capabilities: EMPTY_CAPS,
  },
  {
    platformCode: "GOOGLE_BUSINESS",
    label: "Google Business Profile",
    implementationStatus: "pending",
    isPendingSkeleton: true,
    roadmapNote:
      "Pending provider iskeleti — işletme profili ve mesajlar için yol haritası. Öncelik bildirimi planlamada kullanılır.",
    capabilities: EMPTY_CAPS,
  },
];
