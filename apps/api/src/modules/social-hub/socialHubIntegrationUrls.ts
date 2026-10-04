export function buildSocialHubPublicWebhookUrls(): {
  meta: string;
  whatsapp: string;
  tiktok: string;
  youtube: string;
  x: string;
} {
  const apiBase =
    process.env.API_PUBLIC_BASE_URL?.trim() ??
    "https://app.lerta.com.tr/api/v1";
  const prefix = `${apiBase.replace(/\/$/, "")}/company/social-hub/webhooks`;
  return {
    meta: `${prefix}/meta`,
    whatsapp: `${prefix}/whatsapp`,
    tiktok: `${prefix}/tiktok`,
    youtube: `${prefix}/youtube`,
    x: `${prefix}/x`,
  };
}
