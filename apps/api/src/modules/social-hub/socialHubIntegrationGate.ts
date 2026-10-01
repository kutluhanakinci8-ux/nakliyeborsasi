export type IntegrationGateStepStatus =
  | "ready"
  | "partial"
  | "pending"
  | "manual";

export type IntegrationGateStep = {
  code: "E1" | "E2" | "E3" | "E4" | "E5" | "E6";
  title: string;
  status: IntegrationGateStepStatus;
  detail: string;
};

export type SocialHubIntegrationGate = {
  checklistVersion: 1;
  codeCompletePhase: "bb";
  integrationGatePhase: "bc";
  steps: IntegrationGateStep[];
  automatedReadyCount: number;
  automatedStepCount: number;
  allAutomatedReady: boolean;
  note: string;
};

function envTrim(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function metaOAuthConfigured(): {
  app: boolean;
  webhookVerify: boolean;
} {
  const app =
    Boolean(envTrim("SOCIAL_META_APP_ID")) &&
    Boolean(envTrim("SOCIAL_META_APP_SECRET"));
  const webhookVerify = Boolean(envTrim("SOCIAL_META_WEBHOOK_VERIFY_TOKEN"));
  return { app, webhookVerify };
}

function linkedInOAuthConfigured(): boolean {
  return (
    Boolean(envTrim("SOCIAL_LINKEDIN_CLIENT_ID")) &&
    Boolean(envTrim("SOCIAL_LINKEDIN_CLIENT_SECRET"))
  );
}

function roadmapPartnerKeysConfigured(): {
  tiktok: boolean;
  youtube: boolean;
} {
  return {
    tiktok:
      Boolean(envTrim("SOCIAL_TIKTOK_OAUTH_CLIENT_ID")) &&
      Boolean(envTrim("SOCIAL_TIKTOK_OAUTH_CLIENT_SECRET")),
    youtube:
      Boolean(envTrim("SOCIAL_YOUTUBE_OAUTH_CLIENT_ID")) &&
      Boolean(envTrim("SOCIAL_YOUTUBE_OAUTH_CLIENT_SECRET")),
  };
}

export function buildSocialHubIntegrationGate(input: {
  inboundBridged24h: number;
  inboundBridged7d?: number;
}): SocialHubIntegrationGate {
  const meta = metaOAuthConfigured();
  const linkedIn = linkedInOAuthConfigured();
  const partners = roadmapPartnerKeysConfigured();
  const apiPublic = Boolean(envTrim("API_PUBLIC_BASE_URL"));

  const e1Status: IntegrationGateStepStatus =
    meta.app && meta.webhookVerify && apiPublic
      ? "ready"
      : meta.app
        ? "partial"
        : "pending";

  const e2Status: IntegrationGateStepStatus = e1Status === "ready"
    ? "partial"
    : e1Status === "partial"
      ? "pending"
      : "pending";

  const e3Status: IntegrationGateStepStatus = linkedIn ? "ready" : "pending";

  const e4Status: IntegrationGateStepStatus =
    partners.tiktok && partners.youtube
      ? "ready"
      : partners.tiktok || partners.youtube
        ? "partial"
        : "pending";

  const bridged7d = input.inboundBridged7d ?? 0;
  const e5Status: IntegrationGateStepStatus =
    input.inboundBridged24h > 0
      ? "ready"
      : bridged7d > 0
        ? "partial"
        : "pending";

  const steps: IntegrationGateStep[] = [
    {
      code: "E1",
      title: "Meta: verify token, App Review, prod webhook URL",
      status: e1Status,
      detail:
        e1Status === "ready"
          ? "Meta OAuth ve webhook verify token tanımlı; App Review ve Meta konsol webhook URL doğrulaması operasyon adımı."
          : meta.app
            ? "SOCIAL_META_WEBHOOK_VERIFY_TOKEN veya API_PUBLIC_BASE_URL eksik."
            : "SOCIAL_META_APP_ID / SECRET eksik.",
    },
    {
      code: "E2",
      title: "WhatsApp: WABA + şablon onayları",
      status: e2Status,
      detail:
        e1Status === "ready"
          ? "Meta köprüsü hazır; WABA numarası ve şablon onayları Meta Business Manager üzerinden tamamlanmalı."
          : "Önce Meta OAuth ve webhook verify (E1) tamamlanmalı.",
    },
    {
      code: "E3",
      title: "LinkedIn: Marketing API ürün erişimi",
      status: e3Status,
      detail: linkedIn
        ? "LinkedIn OAuth ortamı tanımlı; ürün erişimi ve firma bağlantısı canlı doğrulama gerektirir."
        : "SOCIAL_LINKEDIN_CLIENT_ID / SECRET eksik.",
    },
    {
      code: "E4",
      title: "TikTok / YouTube: partner anahtarları (prod .env)",
      status: e4Status,
      detail:
        e4Status === "ready"
          ? "TikTok ve YouTube OAuth ortamı tanımlı."
          : e4Status === "partial"
            ? "TikTok veya YouTube OAuth eksik — her iki kanal için client kimlikleri gerekli."
            : "SOCIAL_TIKTOK_* ve SOCIAL_YOUTUBE_* OAuth değişkenleri eksik.",
    },
    {
      code: "E5",
      title: "Pilot: webhook köprü aktivitesi",
      status: e5Status,
      detail:
        e5Status === "ready"
          ? `Son 24 saatte ${input.inboundBridged24h} inbound köprü denetim kaydı.`
          : bridged7d > 0
            ? `24s içinde 0; son 7 günde ${bridged7d} köprü — pilot trafik kısmi.`
            : "Henüz inbound webhook köprü denetimi yok (pilot veya sandbox POST gerekir).",
    },
    {
      code: "E6",
      title: "UAT: 7 sekme manuel + CSV indirmeleri",
      status: "manual",
      detail:
        "Bağlantılar, gelen kutusu, yayınlar, şablonlar, istatistikler, sağlık ve ekip sekmeleri; CSV export’lar manuel UAT ile doğrulanır.",
    },
  ];

  const automated = steps.filter((s) => s.code !== "E6");
  const automatedReadyCount = automated.filter((s) => s.status === "ready").length;

  return {
    checklistVersion: 1,
    codeCompletePhase: "bb",
    integrationGatePhase: "bc",
    steps,
    automatedReadyCount,
    automatedStepCount: automated.length,
    allAutomatedReady: automated.every((s) => s.status === "ready"),
    note:
      "Kod %100 (BB) sonrası canlı entegrasyon kapısı; otomatik adımlar ortam ve denetim metriklerine dayanır.",
  };
}

export function integrationGateStepStatusLabel(
  status: IntegrationGateStepStatus,
): string {
  switch (status) {
    case "ready":
      return "Hazır";
    case "partial":
      return "Kısmi";
    case "pending":
      return "Bekliyor";
    default:
      return "Manuel";
  }
}
