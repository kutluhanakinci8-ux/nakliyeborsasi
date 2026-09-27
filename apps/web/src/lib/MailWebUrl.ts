/** Tam webmail (posta.lerta.com.tr) — logistics uygulamasından SSO linki. */
export function resolveMailWebPublicUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_MAIL_WEB_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  return "https://posta.lerta.com.tr";
}

export function buildMailWebSsoHandoffUrl(
  accessToken: string,
  options?: { embed?: boolean },
): string {
  const base = resolveMailWebPublicUrl();
  const embedQuery = options?.embed ? "?embed=1" : "";
  return `${base}/auth/consume${embedQuery}#access_token=${encodeURIComponent(accessToken)}`;
}
