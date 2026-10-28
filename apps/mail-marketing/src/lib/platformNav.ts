import { MARKETING_KVKK_PRODUCT_ENABLED } from "./marketingFeatureFlags";
import {
  CORPORATE_REGISTER,
  MAIL_WEB_URL,
  MESSAGING_APP_URL,
  MESSAGING_LOGIN_URL,
  U88_APP_URL,
} from "./marketingUrls";

export type PlatformProductId = "home" | "u88" | "posta" | "mesaj";

const ALL_PRODUCT_TABS = [
  { id: "posta" as const, href: "/posta", label: "Posta" },
  { id: "mesaj" as const, href: "/mesaj", label: "Mesajlaşma" },
  { id: "u88" as const, href: "/u88", label: "KVKK" },
] as const;

export const PRODUCT_TABS = ALL_PRODUCT_TABS.filter(
  (tab) => tab.id !== "u88" || MARKETING_KVKK_PRODUCT_ENABLED,
);

export function resolveProductId(pathname: string): PlatformProductId {
  if (pathname.startsWith("/u88")) return "u88";
  if (pathname.startsWith("/posta")) return "posta";
  if (pathname.startsWith("/mesaj")) return "mesaj";
  return "home";
}

export type PlatformCta = {
  label: string;
  href: string;
  variant: "primary" | "outline";
};

export function ctasForProduct(product: PlatformProductId): PlatformCta[] {
  switch (product) {
    case "u88":
      return [
        { label: "Giriş", href: U88_APP_URL, variant: "outline" },
        { label: "Ücretsiz dene", href: U88_APP_URL, variant: "primary" },
      ];
    case "posta":
      return [
        {
          label: "Webmail giriş",
          href: `${MAIL_WEB_URL.replace(/\/$/, "")}/login`,
          variant: "outline",
        },
        { label: "Domain ile başla", href: CORPORATE_REGISTER, variant: "primary" },
      ];
    case "mesaj":
      return [
        { label: "Giriş yap", href: MESSAGING_LOGIN_URL, variant: "primary" },
        { label: "Sohbeti aç", href: MESSAGING_APP_URL, variant: "outline" },
      ];
    default: {
      const ctas: PlatformCta[] = [
        { label: "Domain ile başla", href: CORPORATE_REGISTER, variant: "primary" },
        { label: "Mesaj girişi", href: MESSAGING_LOGIN_URL, variant: "outline" },
      ];
      if (MARKETING_KVKK_PRODUCT_ENABLED) {
        ctas.push({ label: "KVKK dene", href: U88_APP_URL, variant: "outline" });
      }
      return ctas;
    }
  }
}
