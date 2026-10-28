import type { PlatformProductId } from "./platformNav";

export type MarketingMetaNavItem = {
  label: string;
  href: string;
  /** Erişilebilirlik: hangi sayfa ailesi */
  description?: string;
};

/** Üst menü — global B2B kalıbı: Planlar · Güven & uyum · Destek (Durum footer/destek hub). */
export function metaNavForProduct(product: PlatformProductId): MarketingMetaNavItem[] {
  const plansHref =
    product === "mesaj" ? "/mesaj#planlar" : "/posta#fiyatlar";

  return [
    { label: "Planlar", href: plansHref, description: "Fiyatlandırma ve paketler" },
    {
      label: "Güven & uyum",
      href: "/guven",
      description: "Güvenlik, SLA ve veri koruma",
    },
    { label: "Destek", href: "/destek", description: "Yardım ve iletişim" },
  ];
}
