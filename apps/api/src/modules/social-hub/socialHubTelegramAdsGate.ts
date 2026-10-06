export type SocialHubTelegramAdsGate = {
  status: "deferred_v2";
  implemented: "explicit_v2_gate";
  rubrikClosed: true;
  adsApiIntegrated: false;
  utmChannelPublishing: true;
  userFacingLabel: string;
  userFacingNote: string;
  utmGuidance: string;
  docsPath: string;
};

const GATE: SocialHubTelegramAdsGate = {
  status: "deferred_v2",
  implemented: "explicit_v2_gate",
  rubrikClosed: true,
  adsApiIntegrated: false,
  utmChannelPublishing: true,
  userFacingLabel: "Telegram Ads API — v2 kapı",
  userFacingNote:
    "Telegram kanal yayınları (bot + kanal) desteklenir. Resmi Telegram Ads / promote API yönetimi ayrı ürün çizgisinde; partner erişimi ve BM onayı sonrası açılacak.",
  utmGuidance:
    "Kampanya ölçümü için yayın metnindeki https bağlantılarına utm_campaign / utm_source / utm_medium eklenir (organik kanal gönderileri).",
  docsPath: "docs/SOCIAL_HUB_CODE_COMPLETE_ROADMAP.md",
};

export function buildSocialHubTelegramAdsGate(): SocialHubTelegramAdsGate {
  return { ...GATE };
}
