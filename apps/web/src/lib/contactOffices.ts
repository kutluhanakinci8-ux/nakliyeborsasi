export type ContactOffice = {
  id: string;
  city: string;
  country: string;
  label: string;
  addressLine: string;
  phone: string;
  email: string;
  hours: string;
  timezone: string;
  mapEmbedUrl: string;
  directionsUrl: string;
};

export const CONTACT_OFFICES: ContactOffice[] = [
  {
    id: "istanbul",
    city: "İstanbul",
    country: "TR",
    label: "Türkiye merkez",
    addressLine: "Maslak · Şişli, İstanbul",
    phone: "+90 (212) 000 00 00",
    email: "tr@nakliyeborsasi.local",
    hours: "Pzt–Cum 09:00–18:00",
    timezone: "GMT+3",
    mapEmbedUrl:
      "https://www.openstreetmap.org/export/embed.html?bbox=28.968%2C41.002%2C29.012%2C41.028&layer=mapnik&marker=41.015%2C28.99",
    directionsUrl: "https://www.openstreetmap.org/?mlat=41.015&mlon=28.99#map=14/41.015/28.99",
  },
  {
    id: "kyiv",
    city: "Kyiv",
    country: "UA",
    label: "Ukrayna ofisi",
    addressLine: "Pechersk, Kyiv",
    phone: "+380 (44) 000 00 00",
    email: "ua@nakliyeborsasi.local",
    hours: "Pzt–Cum 09:00–17:00",
    timezone: "GMT+2",
    mapEmbedUrl:
      "https://www.openstreetmap.org/export/embed.html?bbox=30.498%2C50.428%2C30.548%2C50.468&layer=mapnik&marker=50.448%2C30.523",
    directionsUrl: "https://www.openstreetmap.org/?mlat=50.448&mlon=30.523#map=14/50.448/30.523",
  },
  {
    id: "eu",
    city: "Varşova",
    country: "PL",
    label: "AB koridoru (EU hub)",
    addressLine: "Śródmieście, Warsaw",
    phone: "+48 22 000 00 00",
    email: "eu@nakliyeborsasi.local",
    hours: "Pzt–Cum 08:00–17:00",
    timezone: "GMT+1",
    mapEmbedUrl:
      "https://www.openstreetmap.org/export/embed.html?bbox=21.0%2C52.218%2C21.04%2C52.242&layer=mapnik&marker=52.23%2C21.012",
    directionsUrl: "https://www.openstreetmap.org/?mlat=52.23&mlon=21.012#map=14/52.23/21.012",
  },
];

export const CONTACT_FAQ: { question: string; answer: string }[] = [
  {
    question: "Demo hesabı nasıl alınır?",
    answer:
      "Giriş sayfasındaki demo kullanıcıları ile hemen deneyebilirsiniz veya formdan «Demo talebi» seçerek kurumsal erişim isteyin.",
  },
  {
    question: "Yanıt süresi ne kadar?",
    answer:
      "Form ve e-posta taleplerine iş günlerinde 24 saat içinde dönüş hedefliyoruz. Acil operasyon için telefon hattını kullanın.",
  },
  {
    question: "Hangi diller destekleniyor?",
    answer: "Platform ve destek: Türkçe, İngilizce, Ukraynaca ve Rusça.",
  },
  {
    question: "Basın ve medya iletişimi?",
    answer: "Formda «Basın» konusunu seçin veya basin@nakliyeborsasi.local adresine yazın.",
  },
];

export type ContactTopic = "demo" | "press" | "career" | "partner" | "support";

export const CONTACT_ROUTES: {
  topic: ContactTopic;
  title: string;
  description: string;
  email: string;
}[] = [
  {
    topic: "demo",
    title: "Demo & satış",
    description: "Platform turu, fiyatlandırma ve kurumsal hesap.",
    email: "sales@nakliyeborsasi.local",
  },
  {
    topic: "support",
    title: "Destek",
    description: "Teknik sorun, entegrasyon ve hesap yardımı.",
    email: "destek@nakliyeborsasi.local",
  },
  {
    topic: "press",
    title: "Basın",
    description: "Basın bülteni, röportaj ve medya kiti.",
    email: "basin@nakliyeborsasi.local",
  },
  {
    topic: "partner",
    title: "İş ortaklığı",
    description: "Forwarder, taşıyıcı ve API partnerliği.",
    email: "partner@nakliyeborsasi.local",
  },
];
