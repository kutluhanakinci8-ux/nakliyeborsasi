export const MESAJ_HERO_STATS = [
  { value: "E2E", label: "Uçtan uca iletişim" },
  { value: "TR", label: "Veri Türkiye'de" },
  { value: "API", label: "Webhook & entegrasyon" },
  { value: "Mobil", label: "Push & PWA" },
] as const;

export const MESAJ_FEATURES = [
  {
    title: "Kanallar ve sohbet",
    description:
      "Ekip kanalları, doğrudan mesajlar ve konu başlıkları — tek kiracıda organize iletişim.",
    icon: "inbox" as const,
  },
  {
    title: "Gerçek zamanlı",
    description:
      "Okundu bilgisi, yazıyor göstergesi, anlık bildirimler ve çevrimiçi durum.",
    icon: "sync" as const,
  },
  {
    title: "Dosya ve medya",
    description:
      "Ekler, önizleme, sesli notlar ve güvenli indirme — kurumsal saklama ile.",
    icon: "devices" as const,
  },
  {
    title: "Kanal köprüleri",
    description:
      "WhatsApp ve Slack köprüleri; müşteri trafiğini firma sohbetine bağlayın.",
    icon: "sync" as const,
  },
  {
    title: "Denetim ve kayıt",
    description:
      "Denetlenebilir mesaj geçmişi, saklama politikaları ve operasyonel raporlama.",
    icon: "shield" as const,
  },
  {
    title: "Güvenlik ve yönetim",
    description:
      "Kiracı izolasyonu, oturum güvenliği ve yönetim konsolu ile kullanıcı yönetimi.",
    icon: "console" as const,
  },
] as const;

export const MESAJ_STEPS = [
  {
    step: "01",
    title: "Kiracı ve ekip",
    body: "Kurumsal hesabınızla giriş yapın; ekip üyelerini davet edin ve rolleri atayın.",
  },
  {
    step: "02",
    title: "Kanalları yapılandırın",
    body: "İç kanallar, köprüler ve bildirim tercihlerini panelden tanımlayın.",
  },
  {
    step: "03",
    title: "Tek yerden yanıtlayın",
    body: "Müşteri ve ekip trafiğini aynı arayüzde toplayın; API ile süreçlerinize bağlayın.",
  },
] as const;

export const MESAJ_CHANNELS = [
  "Firma sohbeti",
  "WhatsApp köprüsü",
  "Slack köprüsü",
  "Webhook",
  "Mobil push",
  "Public API",
] as const;
