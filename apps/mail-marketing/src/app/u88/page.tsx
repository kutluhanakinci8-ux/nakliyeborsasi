import { MarketingPageShell } from "@/components/MarketingPageShell";
export default function U88ProductPage() {
  return (
    <MarketingPageShell>
      <p className="breadcrumb">
        <a href="/">Lerta</a> / KVKK
      </p>
      <section className="hero">
        <p className="hero-eyebrow">Control plane as a service</p>
        <h1>Türkiye&apos;nin KVKK control plane&apos;i</h1>
        <p className="lead">
          Çerez, VERBİS, İYS, DSAR ve ajans white-label — tek panelde. Manuel
          süreçler yerine dakikalar içinde kurulan otomatik uyumluluk altyapısı.
        </p>
        <p className="hero-hint">
          Üst menüden <strong>Ücretsiz dene</strong> ile U88&apos;e geçin — 14 gün
          deneme, kurulum sihirbazı dahil.
        </p>
      </section>

      <section className="grid">
        <article className="card">
          <h3>14 gün ücretsiz deneme</h3>
          <p>Kurulum sihirbazı ile canlıya alma; sabit TL fiyatlandırma.</p>
        </article>
        <article className="card">
          <h3>Consent Mode v2</h3>
          <p>Ölçüm ve pazarlama etiketleri için güncel çerez modeli.</p>
        </article>
        <article className="card">
          <h3>Ajans white-label</h3>
          <p>Müşterilerinize kendi markanızla sunabileceğiniz panel.</p>
        </article>
      </section>
    </MarketingPageShell>
  );
}
