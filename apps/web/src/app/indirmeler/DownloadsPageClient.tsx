"use client";

import Link from "next/link";
import { PublicPageShell } from "../../components/PublicPageShell";
import { SiteLayout } from "../../components/SiteLayout";

const ROADMAP_PHASES = [
  {
    id: "F0",
    months: "Ay 0–2",
    title: "İskelet (TR)",
    items: [
      "Format spec v1.0 ve JSON Schema",
      "Core doğrulama paketi",
      "İndirmeler vitrini ve örnek .ltr",
    ],
  },
  {
    id: "F1",
    months: "Ay 3–6",
    title: "Mühürlü format + web viewer (TR)",
    items: ["Tarayıcı viewer", "PDF’e aktar", "Blok renderer v1"],
  },
  {
    id: "F2",
    months: "Ay 7–10",
    title: "Lerta Posta (TR)",
    items: ["LTR eki ve önizleme", "Arama indeksi", "PDF kopyası opsiyonu"],
  },
  {
    id: "F3",
    months: "Ay 11–14",
    title: "Lerta Mesaj + şablonlar (TR)",
    items: ["Thread viewer", "Lojistik şablonlar", "Link + OG kart"],
  },
  {
    id: "F4",
    months: "Ay 15–18",
    title: "Author + linked güvenlik (TR)",
    items: ["LTR Author beta", "OTP / watermark", "Hosted linked mod"],
  },
  {
    id: "F5",
    months: "Ay 19–21",
    title: "TR ölçek",
    items: ["Mobil + masaüstü viewer", "WA deep link", "Adoption ≥ %45"],
  },
  {
    id: "F6",
    months: "Ay 22–24",
    title: "Global",
    items: ["EN locale", "view portal", "MIME yolu", "EU pilot"],
  },
] as const;

const DOWNLOADS = [
  {
    name: "Örnek teklif (.ltr)",
    desc: "Mühürlü örnek — çift tıkla tarayıcıda açın.",
    href: "/ltr/samples/ornek-teklif.ltr",
    available: true,
  },
  {
    name: "LTR Viewer",
    desc: "Windows / macOS / Linux — F1 ile yayınlanacak.",
    href: "#viewer",
    available: false,
  },
  {
    name: "LTR Author",
    desc: "Belge oluşturma — F4 ile yayınlanacak.",
    href: "#author",
    available: false,
  },
] as const;

export function DownloadsPageClient() {
  return (
    <SiteLayout>
        <PublicPageShell
          pageClassName="about-premium-page"
          breadcrumbLabel="İndirmeler"
          eyebrow="LTR"
          title="LTR indirmeler ve yol haritası"
          lead="LTR (Lerta Document) — operasyonel belgeler için PDF alternatifi. Önce Türkiye pazarı, ardından global ölçek."
          showHeroVisual={false}
        >
        <section className="about-premium-section" id="ltr">
          <h2 className="about-premium-h2">LTR nedir?</h2>
          <p>
            Tek dosya (<code>.ltr</code>), mühürlü HTML paketi. Posta ve mesajlaşmada ek
            olarak gider; karşı taraf hesap açmadan tarayıcıda veya LTR Viewer ile açar.
            Resmi e-Fatura ve mahkeme arşivi için PDF export yan yolu korunur.
          </p>
          <p>
            <Link href="/ltr/spec/ltr-1.0.schema.json" className="press-premium-inline-link">
              JSON Schema (v1.0)
            </Link>
            {" · "}
            Teknik spec ve 24 ay planı: repoda{" "}
            <code>docs/LTR_SPEC_V1_DRAFT.md</code> ve{" "}
            <code>docs/LTR_24_MONTH_ROADMAP.md</code>
          </p>
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
          <h2 className="about-premium-h2">24 aylık faz planı</h2>
          <p style={{ marginBottom: "1rem" }}>
            Hedef: TR Lerta müşterilerinde operasyonel eklerin ≥ %45’i LTR (ay 21); global
            pilot ve spec v1 dondurma (ay 24).
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
