import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import { SOFTWARE_DOWNLOAD_PAGE } from "@/lib/winlrtSoftwareCatalog";
import { SoftwareDownloadPageClient } from "./SoftwareDownloadPageClient";

export const metadata: Metadata = {
  title: `${SOFTWARE_DOWNLOAD_PAGE.title} · Lerta`,
  description: SOFTWARE_DOWNLOAD_PAGE.lead,
};

export default function YazilimIndirPage() {
  return (
    <MarketingPageShell narrow>
      <p className="software-dl-kicker">Destek</p>
      <h1>{SOFTWARE_DOWNLOAD_PAGE.title}</h1>
      <SoftwareDownloadPageClient />
    </MarketingPageShell>
  );
}
