export type PlatformAdminNavItem = {
  href: string;
  label: string;
  description: string;
};

export type PlatformAdminNavSection = {
  id: string;
  title: string;
  items: PlatformAdminNavItem[];
};

export const PLATFORM_ADMIN_NAV: PlatformAdminNavSection[] = [
  {
    id: "general",
    title: "Genel",
    items: [
      {
        href: "/admin",
        label: "Kontrol merkezi",
        description: "Özet, uyarılar ve hızlı erişim",
      },
    ],
  },
  {
    id: "accounts",
    title: "Firmalar ve hesaplar",
    items: [
      {
        href: "/admin/organizasyon",
        label: "Organizasyonlar",
        description: "Doğrulama, profil, koridor, dondurma",
      },
      {
        href: "/admin/kullanicilar",
        label: "Kullanıcılar",
        description: "Üyeler, roller, davetler",
      },
      {
        href: "/admin/abonelikler",
        label: "Abonelikler",
        description: "Planlar ve paket atamaları",
      },
    ],
  },
  {
    id: "market",
    title: "Pazar ve operasyon",
    items: [
      {
        href: "/admin/ilanlar",
        label: "Yük ilanları",
        description: "Marketplace ilan moderasyonu",
      },
      {
        href: "/admin/ihaleler",
        label: "İhaleler",
        description: "Açık ihaleler ve kurallar",
      },
      {
        href: "/admin/guven",
        label: "Güven skorları",
        description: "Değerlendirmeler ve itibar",
      },
    ],
  },
  {
    id: "finance",
    title: "Finans",
    items: [
      {
        href: "/admin/odemeler",
        label: "Ödemeler ve faturalar",
        description: "Tahsilat, fatura, kartlar",
      },
    ],
  },
  {
    id: "system",
    title: "Sistem",
    items: [
      {
        href: "/admin/entegrasyon",
        label: "Entegrasyonlar",
        description: "API, webhook, üçüncü taraf",
      },
      {
        href: "/admin/sistem",
        label: "Platform ayarları",
        description: "Koridor, dil, bakım modu",
      },
    ],
  },
];

export function flattenPlatformAdminNav(): PlatformAdminNavItem[] {
  return PLATFORM_ADMIN_NAV.flatMap((section) => section.items);
}
