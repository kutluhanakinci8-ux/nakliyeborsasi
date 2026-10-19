import { MarketingPageShell } from "@/components/MarketingPageShell";
import { U88_APP_URL } from "@/lib/marketingUrls";

export default function U88ProductPage() {
  return (
    <MarketingPageShell narrow>
      <p className="breadcrumb">
        <a href="/">Lerta</a> / U88
      </p>
      <section className="hero">
        <p className="hero-eyebrow">Control plane as a service</p>
        <h1>Türkiye&apos;nin KVKK control plane&apos;i</h1>
        <p className="lead">
          Çerez, VERBİS, İYS, DSAR ve ajans white-label — tek panelde. Manuel
          süreçler yerine dakikalar içinde kurulan otomatik uyumluluk altyapısı.
        </p>
        <div className="hero-cta">
          <a className="btn btn-primary" href={U88_APP_URL}>
            U88 uygulaması
          </a>
          <a className="btn btn-ghost" href="/">
            Tüm ürünler
          </a>
        </div>
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
