export const PLATFORM_NAV_ITEMS = [
  { href: "/marketplace", label: "Yük arama" },
  { href: "/auctions", label: "İhaleler" },
  { href: "/messaging", label: "Mesajlar" },
  { href: "/trust", label: "Güven" },
  { href: "/integrations", label: "Entegrasyon" },
] as const;

/** Ana menüde tek link */
export const HIZMETLER_NAV_ITEM = {
  href: "/hizmetler",
  label: "Hizmetler",
} as const;

/** «Kurumsal» açılır menüsü */
export const CORPORATE_DROPDOWN_ITEMS = [
  { href: "/hakkimizda", label: "Hakkımızda" },
  { href: "/basin", label: "Basın" },
  { href: "/kariyer", label: "Kariyer" },
  { href: "/blog", label: "Blog" },
  { href: "/iletisim", label: "İletişim" },
  { href: "/ui-ornekleri", label: "Tasarım önizleme" },
] as const;

export const CORPORATE_NAV_ITEMS = [
  HIZMETLER_NAV_ITEM,
  ...CORPORATE_DROPDOWN_ITEMS,
] as const;

export type BlogPostSummary = {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  category: string;
};

export const BLOG_POSTS: BlogPostSummary[] = [
  {
    slug: "tr-ua-eu-koridoru-2026",
    title: "TR · UA · EU koridorunda dijital borsa trendleri",
    excerpt:
      "Sınır geçişleri, sigorta ve e-irsaliye entegrasyonunun yük borsalarını nasıl şekillendirdiği.",
    publishedAt: "2026-09-15",
    category: "Sektör",
  },
  {
    slug: "ihale-ve-teklif-guveni",
    title: "İhale ve teklif süreçlerinde güven skoru",
    excerpt:
      "Taşıyıcı seçiminde puan, değerlendirme ve platform içi mesajlaşmanın rolü.",
    publishedAt: "2026-09-01",
    category: "Ürün",
  },
  {
    slug: "dis-kaynak-entegrasyonu",
    title: "Lardi ve Della verisini tek ekranda toplamak",
    excerpt:
      "Harici adapter’lar ile marketplace aramasını birleştirmenin operasyonel faydası.",
    publishedAt: "2026-08-20",
    category: "Entegrasyon",
  },
];

export function findBlogPost(slug: string): BlogPostSummary | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
