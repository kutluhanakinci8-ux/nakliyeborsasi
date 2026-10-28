import { MARKETING_FAQ_ACTIVE } from "./marketingFaq";

export type SupportSearchHit = {
  id: string;
  title: string;
  excerpt: string;
  href: string;
};

/** Destek hub araması — SSS + sabit rehber hedefleri (Faz 2'de genişler). */
export const SUPPORT_SEARCH_INDEX: SupportSearchHit[] = [
  ...MARKETING_FAQ_ACTIVE.map((item, i) => ({
    id: `faq-${i}`,
    title: item.q,
    excerpt: item.a,
    href: "/sss",
  })),
  {
    id: "guide-dns",
    title: "DNS ve domain doğrulama",
    excerpt: "MX, SPF, DKIM, DMARC kayıtları ve yönetim konsolu doğrulama adımları.",
    href: "/sss",
  },
  {
    id: "guide-webmail",
    title: "Webmail girişi",
    excerpt: "posta.lerta.com.tr üzerinden kurumsal posta kutusu.",
    href: "/sss",
  },
  {
    id: "sla",
    title: "Hizmet düzeyi (SLA)",
    excerpt: "Kullanılabilirlik hedefleri ve destek yanıt süreleri.",
    href: "/sla",
  },
  {
    id: "status",
    title: "Canlı durum",
    excerpt: "Posta, mesaj ve platform bileşenlerinin güncel sağlık durumu.",
    href: "/durum",
  },
  {
    id: "trust",
    title: "Güven ve uyum",
    excerpt: "Türkiye barındırma, KVKK özeti ve güvenlik politikaları.",
    href: "/guven",
  },
];

export function searchSupportIndex(query: string, limit = 8): SupportSearchHit[] {
  const q = query.trim().toLocaleLowerCase("tr");
  if (q.length < 2) return [];

  return SUPPORT_SEARCH_INDEX.filter((hit) => {
    const blob = `${hit.title} ${hit.excerpt}`.toLocaleLowerCase("tr");
    return blob.includes(q);
  }).slice(0, limit);
}
