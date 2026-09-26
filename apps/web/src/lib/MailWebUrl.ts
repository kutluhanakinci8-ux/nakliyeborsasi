/** Tam webmail (posta.lerta.com.tr) — logistics uygulamasından SSO linki. */
export function resolveMailWebPublicUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_MAIL_WEB_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  return "https://posta.lerta.com.tr";
}

export function buildMailWebSsoHandoffUrl(accessToken: string): string {
  const base = resolveMailWebPublicUrl();
  return `${base}/auth/consume#access_token=${encodeURIComponent(accessToken)}`;
}
