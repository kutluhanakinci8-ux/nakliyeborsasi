"use client";

import Link from "next/link";
import { PublicPageShell } from "../../components/PublicPageShell";
import { SiteLayout } from "../../components/SiteLayout";

const WINLRT_PHASES = [
  {
    id: "W0",
    months: "Şimdi",
    title: "Format + iskelet",
    items: ["`.ltr` spec ve core", "Web viewer köprü", "apps/winlrt iskeleti"],
  },
  {
    id: "W1",
    months: "Sıradaki",
    title: "WinLRT — Windows",
    items: ["Tauri istemci", ".ltr ilişkilendirme", "Beta MSI · merge/deploy #1"],
  },
  {
    id: "W2",
    months: "W1 sonrası",
    title: "WinLRT — macOS",
    items: ["DMG + notarization", "merge/deploy #2"],
  },
  {
    id: "W3",
    months: "W2 sonrası",
    title: "WinLRT — Android",
    items: ["Google Play test", "com.lerta.winlrt", "merge/deploy #3"],
  },
  {
    id: "W4",
    months: "W3 sonrası",
    title: "WinLRT — iOS",
    items: ["TestFlight → App Store", "merge/deploy #4"],
  },
  {
    id: "W5",
    months: "W4 sonrası",
    title: "WinLRT olgun",
    items: ["Belge oluştur (Author v1)", "Lojistik şablonlar", "merge/deploy #5"],
  },
  {
    id: "W6+",
    months: "Sonra",
    title: "Lerta Posta / Mesaj",
    items: ["LTR eki entegrasyonu", "Linked sunucu", "docs/LTR_24_MONTH_ROADMAP"],
  },
] as const;

const ROADMAP_PHASES = WINLRT_PHASES;

const DOWNLOADS = [
  {
    name: "WinLRT for Windows",
    desc: "W1 — .ltr aç, yazdır, PDF (yakında).",
    href: "#winlrt-windows",
    available: false,
  },
  {
    name: "WinLRT for Mac",
    desc: "W2 — yakında.",
    href: "#winlrt-mac",
    available: false,
  },
  {
    name: "WinLRT (Google Play)",
    desc: "W3 — Android.",
    href: "#stores",
    available: false,
  },
  {
    name: "WinLRT (App Store)",
    desc: "W4 — iOS.",
    href: "#stores",
    available: false,
  },
  {
    name: "Örnek teklif (.ltr)",
    desc: "Mühürlü örnek — WinLRT veya web viewer ile açın.",
    href: "/ltr/samples/ornek-teklif.ltr",
    available: true,
  },
  {
    name: "Web viewer (geçici)",
    desc: "WinLRT indirmeden önce tarayıcıda deneyin.",
    href: "/ltr/viewer",
    available: true,
  },
] as const;

export function DownloadsPageClient() {
  return (
    <SiteLayout>
        <PublicPageShell
          pageClassName="about-premium-page"
          breadcrumbLabel="İndirmeler"
          eyebrow="WinLRT"
          title="WinLRT indirmeler"
          lead="WinRAR benzeri istemci — format .ltr (Lerta Document). Önce Windows, Mac, Android ve iOS indirilebilir sürümler; Lerta Posta/Mesaj entegrasyonu sonra."
          showHeroVisual={false}
        >
        <section className="about-premium-section" id="winlrt">
          <h2 className="about-premium-h2">WinLRT nedir?</h2>
          <p>
            <strong>WinLRT</strong>, <code>.ltr</code> belgelerini açan ve oluşturan indirilebilir
            programdır (Windows, Mac, Android, iOS). WinRAR gibi kurulur; RAR/WinZip kullanılmaz.
            Detay: <code>docs/WINLRT_PRODUCT_ROADMAP.md</code>
          </p>
        </section>

        <section className="about-premium-section" id="ltr">
          <h2 className="about-premium-h2">LTR formatı</h2>
          <p>
            Tek dosya (<code>.ltr</code>), mühürlü HTML paketi. WinLRT ile açılır; ileride Posta ve
            mesajlaşmada ek olur. PDF export arşiv içindir.
          </p>
          <p>
            <Link href="/ltr/spec/ltr-1.0.schema.json" className="press-premium-inline-link">
              JSON Schema (v1.0)
            </Link>
            {" · "}
            Teknik spec ve 24 ay planı: repoda{" "}
            <code>docs/LTR_SPEC_V1_DRAFT.md</code> ve{" "}
            <code>docs/LTR_24_MONTH_ROADMAP.md</code>
            {" · "}
            <code>docs/WINLRT_PRODUCT_ROADMAP.md</code>
          </p>
        </section>

        <section className="about-premium-section" id="stores">
          <h2 className="about-premium-h2">Mağazalar</h2>
          <p>
            Tek uygulama markası: <strong>WinLRT</strong> (<code>com.lerta.winlrt</code>).
            Lerta Logistics’ten ayrı listelenir.
          </p>
          <ul style={{ paddingLeft: "1.25rem" }}>
            <li>W1: Windows beta (indirmeler sayfasından MSI)</li>
            <li>W2: macOS DMG</li>
            <li>W3: Google Play</li>
            <li>W4: App Store</li>
          </ul>
        </section>

        <section className="about-premium-section" id="indir">
          <h2 className="about-premium-h2">Dosyalar</h2>
          <ul className="site-footer-links">
            {DOWNLOADS.map((item) => (
              <li key={item.name} style={{ marginBottom: "0.75rem" }}>
                {item.available ? (
                  <Link href={item.href} download>
                    {item.name}
                  </Link>
                ) : (
                  <span style={{ opacity: 0.7 }}>{item.name} (yakında)</span>
                )}
                <br />
                <span style={{ fontSize: "0.9rem", opacity: 0.85 }}>{item.desc}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="about-premium-section" id="plan">
          <h2 className="about-premium-h2">WinLRT yol haritası</h2>
          <p style={{ marginBottom: "1rem" }}>
            Her faz sonunda main merge ve deploy. W5 sonrası Lerta Posta/Mesaj LTR entegrasyonu.
          </p>
          <div style={{ display: "grid", gap: "1rem" }}>
            {ROADMAP_PHASES.map((phase) => (
              <article
                key={phase.id}
                style={{
                  border: "1px solid var(--border-subtle, #dfe3ea)",
                  borderRadius: 8,
                  padding: "1rem 1.25rem",
                }}
              >
                <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.75 }}>
                  {phase.id} · {phase.months}
                </p>
                <h3 style={{ margin: "0.25rem 0 0.5rem", fontSize: "1.05rem" }}>
                  {phase.title}
                </h3>
                <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                  {phase.items.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </PublicPageShell>
    </SiteLayout>
  );
}
