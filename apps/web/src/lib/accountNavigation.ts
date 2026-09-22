export type AccountMenuIconId =
  | "organization"
  | "employees"
  | "applications"
  | "payments"
  | "partners"
  | "profile";

export type AccountMenuItem = {
  href: string;
  label: string;
  icon: AccountMenuIconId;
};

export const ACCOUNT_MENU_ITEMS: readonly AccountMenuItem[] = [
  { href: "/hesap/organizasyon", label: "Benim organizasyonum", icon: "organization" },
  { href: "/hesap/calisanlar", label: "Çalışanlarım", icon: "employees" },
  { href: "/hesap/uygulamalar", label: "Benim uygulamalarım", icon: "applications" },
  { href: "/hesap/odemeler", label: "Benim ödemelerim", icon: "payments" },
  { href: "/hesap/ortaklar", label: "Ortaklarım", icon: "partners" },
  { href: "/hesap/profil", label: "Benim profilim", icon: "profile" },
] as const;

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
