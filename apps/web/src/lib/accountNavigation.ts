export type AccountMenuIconId =
  | "organization"
  | "listings"
  | "employees"
  | "applications"
  | "payments"
  | "partners"
  | "profile";

export type AccountMenuItem = {
  href: string;
  label: string;
  lead: string;
  icon: AccountMenuIconId;
};

export const ACCOUNT_MENU_ITEMS: readonly AccountMenuItem[] = [
  {
    href: "/hesap/organizasyon",
    label: "Benim organizasyonum",
    lead:
      "Firma kimliği, koridor yetkileri ve doğrulama durumu — rakiplerdeki gibi kartlar halinde, Nakliye Borsası kurumsal diliyle.",
    icon: "organization",
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
    lead: "Kullanıcı davetleri, roller ve ekip erişimleri.",
    icon: "employees",
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
    lead: "Faturalar, ödeme yöntemleri ve abonelik planı.",
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
    lead: "Kişisel bilgiler, şifre ve bildirim tercihleri.",
    icon: "profile",
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
