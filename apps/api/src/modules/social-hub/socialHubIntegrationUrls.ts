function socialHubWebhookPrefix(): string {
  const apiBase =
    process.env.API_PUBLIC_BASE_URL?.trim() ??
    "https://app.lerta.com.tr/api/v1";
  return `${apiBase.replace(/\/$/, "")}/company/social-hub/webhooks`;
}

export function buildTelegramConnectionWebhookUrl(connectionId: string): string {
  const id = connectionId.trim();
  return `${socialHubWebhookPrefix()}/telegram/connection/${id}`;
}

export function buildSocialHubPublicWebhookUrls(): {
  meta: string;
  whatsapp: string;
  tiktok: string;
  youtube: string;
  x: string;
  telegramWebhookPattern: string;
} {
  const prefix = socialHubWebhookPrefix();
  return {
    meta: `${prefix}/meta`,
    whatsapp: `${prefix}/whatsapp`,
    tiktok: `${prefix}/tiktok`,
    youtube: `${prefix}/youtube`,
    x: `${prefix}/x`,
    telegramWebhookPattern: `${prefix}/telegram/connection/{connectionId}`,
  };
}
