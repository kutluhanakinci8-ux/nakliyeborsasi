export function roadmapConnectedHint(platformCode: string): string {
  if (platformCode === "TIKTOK") {
    return "Beta — gelen TikTok webhook Mesajlar köprüsüne aktarılabilir; giden mesaj ortam bayrağı ile.";
  }
  if (platformCode === "YOUTUBE") {
    return "Beta — YouTube Pub/Sub webhook Mesajlar köprüsüne aktarılabilir; giden mesaj ortam bayrağı ile.";
  }
  if (platformCode === "X") {
    return "Bağlı — @ hesabı OAuth ile doğrulandı; DM ve tweet yayını sonraki API fazında.";
  }
  return "Beta kanal — mesajlaşma ve yayın API’leri henüz aktif değil.";
}
