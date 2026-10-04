export function roadmapConnectedHint(platformCode: string): string {
  if (platformCode === "TIKTOK") {
    return "Beta — gelen TikTok webhook Mesajlar köprüsüne aktarılabilir; giden mesaj ortam bayrağı ile.";
  }
  if (platformCode === "YOUTUBE") {
    return "Beta — YouTube Pub/Sub webhook Mesajlar köprüsüne aktarılabilir; giden mesaj ortam bayrağı ile.";
  }
  if (platformCode === "X") {
    return "Bağlı — tweet (SOCIAL_X_PUBLISH_ENABLED=1) ve DM webhook/giden bayrakları ile Mesajlar köprüsü.";
  }
  return "Beta kanal — mesajlaşma ve yayın API’leri henüz aktif değil.";
}
