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
  options?: { embed?: boolean; composeTo?: string },
): string {
  const base = resolveMailWebPublicUrl();
  const params = new URLSearchParams();
  if (options?.embed) {
    params.set("embed", "1");
  }
  const composeTo = options?.composeTo?.trim();
  if (composeTo) {
    params.set("composeTo", composeTo);
  }
  const qs = params.toString();
  return `${base}/auth/consume${qs ? `?${qs}` : ""}#access_token=${encodeURIComponent(accessToken)}`;
}
