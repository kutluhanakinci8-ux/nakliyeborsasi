import {
  CORPORATE_REGISTER,
  MAIL_WEB_URL,
  MESSAGING_APP_URL,
  MESSAGING_LOGIN_URL,
  U88_APP_URL,
} from "./marketingUrls";

export type PlatformProduct = {
  slug: "u88" | "posta" | "mesaj";
  name: string;
  tagline: string;
  summary: string;
  accent: "violet" | "blue" | "emerald";
  href: string;
  ctaLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  features: string[];
};

export const PLATFORM_PRODUCTS: PlatformProduct[] = [
  {
    slug: "posta",
    name: "Lerta Posta",
    tagline: "Kurumsal e-posta SaaS",
    summary:
      "Özel domain, DNS sihirbazı, modern webmail ve IMAP — Türkiye'de kiracı izolasyonu.",
    accent: "blue",
    href: "/posta",
    ctaLabel: "Posta ürünü",
    secondaryHref: `${MAIL_WEB_URL.replace(/\/$/, "")}/login`,
    secondaryLabel: "Webmail giriş",
    features: [
      "MX · SPF · DKIM · DMARC",
      "Exchange / Gmail bağlantı",
      "PWA + IMAP mobil",
    ],
  },
  {
    slug: "mesaj",
    name: "Lerta Mesaj",
    tagline: "Firma sohbeti ve entegrasyon",
    summary:
      "Kanal tabanlı mesajlaşma, ekler, bildirimler ve WhatsApp / Slack köprüleri.",
    accent: "emerald",
    href: MESSAGING_APP_URL,
    ctaLabel: "Mesajlaşmaya git",
    secondaryHref: MESSAGING_LOGIN_URL,
    secondaryLabel: "Giriş yap",
    features: ["Gerçek zamanlı sohbet", "KVKK kayıt", "API ve webhook"],
  },
  {
    slug: "u88",
    name: "KVKK (U88)",
    tagline: "KVKK control plane",
    summary:
      "Çerez, VERBİS, İYS, DSAR ve ajans white-label — tek panelde uyumluluk otomasyonu.",
    accent: "violet",
    href: U88_APP_URL,
    ctaLabel: "KVKK paneli",
    secondaryHref: "/u88",
    secondaryLabel: "Ürün özeti",
    features: ["Consent Mode v2", "VERBİS + İYS", "14 gün deneme"],
  },
];

export const PLATFORM_REGISTER_HREF = CORPORATE_REGISTER;
