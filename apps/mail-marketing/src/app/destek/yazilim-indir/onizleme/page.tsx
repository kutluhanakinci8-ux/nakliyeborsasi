import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import { LtrBrowserPreviewClient } from "./LtrBrowserPreviewClient";

export const metadata: Metadata = {
  title: "LTR tarayıcı önizlemesi · Lerta",
  description: "WinLRT kurmadan .ltr belgesi yükleyin.",
};

export default function LtrOnizlemePage() {
  return (
    <MarketingPageShell narrow>
      <h1>Tarayıcı önizlemesi</h1>
      <LtrBrowserPreviewClient />
    </MarketingPageShell>
  );
}
