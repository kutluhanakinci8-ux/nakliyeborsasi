export type SocialHubHealthPushHookConfig = {
  status: "skeleton";
  channel: "messaging_web_push_deferred";
  preferenceCode: "SOCIAL_HUB_HEALTH_PUSH_CRITICAL";
  note: string;
};

export type SocialHubPwaConfig = {
  manifestPath: string;
  startUrl: string;
  scope: string;
  display: "standalone";
  healthPushHook: SocialHubHealthPushHookConfig;
};

export function buildSocialHubPwaConfig(): SocialHubPwaConfig {
  return {
    manifestPath: "/manifest-social-hub.webmanifest",
    startUrl: "/hesap/sosyal-medya",
    scope: "/hesap/sosyal-medya",
    display: "standalone",
    healthPushHook: {
      status: "skeleton",
      channel: "messaging_web_push_deferred",
      preferenceCode: "SOCIAL_HUB_HEALTH_PUSH_CRITICAL",
      note:
        "Kritik sosyal hub sağlık uyarıları için web push köprüsü iskeleti; Mesajlar VAPID altyapısı ile hizalanacak.",
    },
  };
}
