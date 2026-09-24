export type AccountMenuIconId =
  | "organization"
  | "listings"
  | "employees"
  | "fleet"
  | "driverPortal"
  | "applications"
  | "payments"
  | "partners"
  | "profile";

export type AccountMenuItem = {
  href: string;
  label: string;
  lead: string;
  icon: AccountMenuIconId;
  /** Profil gibi sekmelerde üst başlık alanını gizler; sekme çubuğu yeterli. */
  hidePageHero?: boolean;
};

export const ACCOUNT_MENU_ITEMS: readonly AccountMenuItem[] = [
  {
    href: "/hesap/organizasyon",
    label: "Benim organizasyonum",
    lead:
      "Firma kimliği, doğrulama, koridorlar, kurumsal iletişim ve abonelik — çok kullanıcılı hesabın yönetim merkezi.",
    icon: "organization",
    hidePageHero: true,
  },
  {
    href: "/hesap/ilanlar",
    label: "İlanlarım",
    lead:
      "Firmanıza ait yük ilanları — düzenleme ve yeni ilan marketplace üzerinden.",
    icon: "listings",
  },
  {
    href: "/hesap/calisanlar",
    label: "Çalışanlarım",
    lead:
      "Ofis davetleri ve filo şoför/araç özet listesi (canlı API); tam yönetim Filo sekmesinde.",
    icon: "employees",
  },
  {
    href: "/hesap/filo",
    label: "Filo ve şoförler",
    lead:
      "Taşıyıcı filonuz: şoförler, çekici/kamyon kayıtları ve aktif eşleştirmeler — TR·UA·EU uyumlu alanlar.",
    icon: "fleet",
  },
  {
    href: "/sofor",
    label: "Şoför panelim",
    lead:
      "Görev, teslimat geçmişi ve kazanç özeti — global şoför portalı (/sofor).",
    icon: "driverPortal",
  },
  {
    href: "/hesap/uygulamalar",
    label: "Benim uygulamalarım",
    lead: "API anahtarları, webhook’lar ve bağlı entegrasyonlar.",
    icon: "applications",
  },
  {
    href: "/hesap/odemeler",
    label: "Benim ödemelerim",
    lead: "Ödeme yöntemi, e-fatura bilgileri ve tahsilat geçmişi (plan özeti organizasyon ile senkron).",
    icon: "payments",
  },
  {
    href: "/hesap/ortaklar",
    label: "Ortaklarım",
    lead: "Taşıyıcı ve gönderici ortaklıkları, davetler ve paylaşılan ilanlar.",
    icon: "partners",
  },
  {
    href: "/hesap/profil",
    label: "Benim profilim",
    lead: "Kişisel bilgiler, dil, bildirimler ve oturum güvenliği — firma verisi organizasyon sekmesinde.",
    icon: "profile",
    hidePageHero: true,
  },
] as const;

export function resolveAccountPageMeta(pathname: string): AccountMenuItem | null {
  return (
    ACCOUNT_MENU_ITEMS.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    ) ?? null
  );
}

export function resolveAccountDisplayName(emailAddress: string): string {
  const local = emailAddress.split("@")[0]?.trim() ?? "";
  if (!local) {
    return "Hesap";
  }
  const firstSegment = local.split(/[._-]/)[0] ?? local;
  return firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1).toLowerCase();
}

export function resolveAccountInitials(emailAddress: string): string {
  const local = emailAddress.split("@")[0]?.trim() ?? "";
  if (!local) {
    return "NB";
  }
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }
  const word = parts[0] ?? local;
  if (word.length >= 2) {
    return word.slice(0, 2).toUpperCase();
  }
  return word.charAt(0).toUpperCase();
}
