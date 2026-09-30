const REASON_LABELS: Record<string, string> = {
  missing_code: "OAuth kodu alınamadı. Bağlantıyı tekrar deneyin.",
  access_denied: "Meta veya LinkedIn erişim iznini reddetti.",
  oauth_exchange_failed: "Token alınamadı. Sunucu yapılandırmasını kontrol edin.",
};

export function formatSocialHubOAuthReason(reason: string): string {
  const decoded = decodeURIComponent(reason.replace(/\+/g, " "));
  const direct = REASON_LABELS[decoded] ?? REASON_LABELS[reason];
  if (direct) {
    return direct;
  }
  if (decoded.includes("SOCIAL_OAUTH_ENCRYPTION_KEY")) {
    return "Sunucuda SOCIAL_OAUTH_ENCRYPTION_KEY tanımlı değil.";
  }
  if (decoded.toLowerCase().includes("redirect_uri")) {
    return "OAuth redirect URI uyuşmuyor; Meta/LinkedIn uygulama ayarlarını kontrol edin.";
  }
  return decoded.length > 180 ? `${decoded.slice(0, 180)}…` : decoded;
}
