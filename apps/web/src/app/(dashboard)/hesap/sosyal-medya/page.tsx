import type { Metadata } from "next";
import { SocialHubPageClient } from "./SocialHubPageClient";

export const metadata: Metadata = {
  title: "Sosyal medya & kanallar | Lerta",
  description:
    "Meta, WhatsApp, LinkedIn, TikTok, YouTube ve yol haritası kanalları — bağlantılar, gelen kutusu ve yayınlar.",
  manifest: "/manifest-social-hub.webmanifest",
  themeColor: "#0f766e",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sosyal hub",
  },
};

export default function AccountSocialHubPage() {
  return <SocialHubPageClient />;
}
