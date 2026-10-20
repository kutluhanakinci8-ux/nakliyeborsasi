import { MarketingPageShell } from "@/components/MarketingPageShell";
import { PlatformProductCards } from "@/components/PlatformProductCards";
import { PLATFORM_PRODUCTS, PLATFORM_REGISTER_HREF } from "@/lib/platformProducts";

export default function PlatformHomePage() {
  return (
    <MarketingPageShell>
      <section className="hero hero-platform">
        <p className="hero-eyebrow">POSTA · MESAJLAŞMA · KVKK</p>
        <h1>Posta, mesajlaşma ve uyumluluk — tek marka altında</h1>
        <p className="lead">
          Türkiye&apos;de barındırılan kurumsal ürünler: <strong>Lerta Posta</strong> ile
          domain tabanlı e-posta, <strong>Lerta Mesaj</strong> ile firma içi ve müşteri
          sohbeti, <strong>KVKK (U88)</strong> ile çerez ve VERBİS control plane.
        </p>
        <div className="hero-cta hero-cta--compact">
          <a className="btn btn-primary" href="/posta#fiyatlar">
            Posta planları
          </a>
          <a className="btn btn-ghost" href="/mesaj">
            Mesajlaşma
          </a>
          <a className="btn btn-ghost" href="/u88">
            KVKK
          </a>
        </div>
        <p className="hero-hint">
          Üst menü sırası: <strong>Posta</strong>, <strong>Mesajlaşma</strong>,{" "}
          <strong>KVKK</strong>. Mesaj için <strong>Giriş</strong>; KVKK için{" "}
          <strong>Ücretsiz dene</strong>. Kurumsal posta kaydı:{" "}
          <a href={PLATFORM_REGISTER_HREF}>yonetim.lerta.com.tr</a>
        </p>
      </section>

      <section className="platform-section" aria-labelledby="products-heading">
        <h2 id="products-heading" className="section-title">Ürünler</h2>
        <p className="section-lead">
          Her ürün ayrı uygulama ve kiracı modeliyle çalışır; istediğiniz
          kombinasyonu seçin.
        </p>
        <PlatformProductCards products={PLATFORM_PRODUCTS} />
      </section>

      <section className="trust-strip" aria-labelledby="trust-heading">
        <h2 id="trust-heading">Güven ve şeffaflık</h2>
        <div className="trust-links">
          <a href="/sss">Sık sorulan sorular</a>
          <a href="/sla">Hizmet düzeyi (SLA)</a>
          <a href="/kvkk">KVKK aydınlatma</a>
          <a href="/durum">Canlı durum</a>
          <a href="/iletisim">İletişim</a>
        </div>
      </section>
    </MarketingPageShell>
  );
}
