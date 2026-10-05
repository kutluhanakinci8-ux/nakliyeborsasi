export function formatSocialHubOAuthReason(reason: string): string {
  const decoded = decodeURIComponent(reason.replace(/\+/g, " "));
  const map: Record<string, string> = {
    missing_code:
      "Meta izin ekranı tamamlanmadı (geçersiz scope veya iptal). Instagram için «Bağlan» tekrar deneyin (Instagram girişi). Messenger için Meta Developer’da Facebook Login for Business açık olmalı.",
    access_denied: "Meta veya LinkedIn erişim iznini reddetti.",
    oauth_exchange_failed: "Token alınamadı. Sunucu yapılandırmasını kontrol edin.",
  };
  if (map[decoded] || map[reason]) {
    return map[decoded] ?? map[reason] ?? decoded;
  }
  if (decoded.includes("SOCIAL_OAUTH_ENCRYPTION_KEY")) {
    return "Sunucuda SOCIAL_OAUTH_ENCRYPTION_KEY tanımlı değil.";
  }
  if (decoded.toLowerCase().includes("redirect_uri")) {
    return "OAuth redirect URI uyuşmuyor; uygulama ayarlarını kontrol edin.";
  }
  return decoded.length > 180 ? `${decoded.slice(0, 180)}…` : decoded;
}
