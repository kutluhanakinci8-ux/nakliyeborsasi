import Link from "next/link";
import { PublicPageShell } from "../../../components/PublicPageShell";
import { SiteLayout } from "../../../components/SiteLayout";
import { LtrViewerClient } from "./LtrViewerClient";

export default function LtrViewerPage() {
  return (
    <SiteLayout>
      <PublicPageShell
        pageClassName="about-premium-page"
        breadcrumbLabel="LTR Viewer"
        eyebrow="LTR · F1"
        title="Web viewer"
        lead="Mühürlü LTR dosyalarını tarayıcıda açın. Google Play ve App Store sürümleri aynı renderer çekirdeğini kullanacak."
        showHeroVisual={false}
      >
        <p style={{ marginBottom: "1rem" }}>
          <Link href="/indirmeler" className="press-premium-inline-link">
            ← İndirmeler
          </Link>
        </p>
        <LtrViewerClient />
      </PublicPageShell>
    </SiteLayout>
  );
}
