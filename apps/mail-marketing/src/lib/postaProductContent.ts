import { CONSOLE_URL, MAIL_WEB_URL } from "./marketingUrls";

export const POSTA_LOGIN = `${MAIL_WEB_URL.replace(/\/$/, "")}/login`;
export const POSTA_CONSOLE = `${CONSOLE_URL.replace(/\/$/, "")}/login`;

export const POSTA_HERO_STATS = [
  { value: "TR", label: "Veri Türkiye'de" },
  { value: "99,9%", label: "Hedef SLA" },
  { value: "DKIM", label: "İmzalı gönderim" },
  { value: "PWA", label: "Mobil webmail" },
] as const;

export const POSTA_FEATURES = [
  {
    title: "Kurumsal domain",
    description:
      "info@sizinmarka.com adresleri; MX, SPF, DKIM ve DMARC adımlarını panelden takip edin.",
    icon: "domain" as const,
  },
  {
    title: "Modern webmail",
    description:
      "Gelen kutusu, akıllı sıralama, taslaklar, ekler ve kurumsal imza — Gmail benzeri deneyim.",
    icon: "inbox" as const,
  },
  {
    title: "Harici hesaplar",
    description:
      "Exchange / Microsoft 365, Gmail ve takvim bağlantıları; tek birleşik gelen kutusu.",
    icon: "sync" as const,
  },
  {
    title: "IMAP & mobil",
    description:
      "Thunderbird, Apple Mail ve Outlook mobil; Dovecot üzerinde güvenli IMAP/SMTP.",
    icon: "devices" as const,
  },
  {
    title: "Güvenlik katmanı",
    description:
      "Rspamd filtreleme, kiracı izolasyonu, 2FA ve uygulama kilidi seçenekleri.",
    icon: "shield" as const,
  },
  {
    title: "Yönetim konsolu",
    description:
      "Kullanıcılar, kotolar, DNS sihirbazı ve teslimat metrikleri — yonetim.lerta.com.tr.",
    icon: "console" as const,
  },
] as const;

export const POSTA_STEPS = [
  {
    step: "01",
    title: "Domain ve plan",
    body: "Kurumsal kayıt ile alan adınızı ekleyin; DNS kayıtlarını sihirbazdan doğrulayın.",
  },
  {
    step: "02",
    title: "Kutuları açın",
    body: "Ekip üyelerine posta kutusu atayın; webmail veya IMAP ile hemen kullanıma alın.",
  },
  {
    step: "03",
    title: "Gönderime hazır",
    body: "İmzalı gönderim, teslimat izleme ve kampanya araçlarıyla ölçeklenin.",
  },
] as const;
