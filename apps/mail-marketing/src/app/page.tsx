import { MarketingPageShell } from "@/components/MarketingPageShell";
import { PlatformProductCards } from "@/components/PlatformProductCards";
import { HomePremiumHero } from "@/components/HomePremiumHero";
import { PLATFORM_PRODUCTS_ACTIVE } from "@/lib/platformProducts";

export default function PlatformHomePage() {
  return (
    <MarketingPageShell>
      <HomePremiumHero />

      <section className="platform-section premium-products" aria-labelledby="products-heading">
        <div className="section-head section-head--center">
          <h2 id="products-heading" className="section-title section-title--lg">
            Ürünler
          </h2>
          <p className="section-lead section-lead--wide">
            Posta ve Mesaj ayrı uygulama ve kiracı modeliyle çalışır; ihtiyacınıza
            göre e-posta veya firma sohbeti ile başlayın.
          </p>
        </div>
        <PlatformProductCards products={PLATFORM_PRODUCTS_ACTIVE} featuredSlug="posta" />
      </section>

      <section className="trust-strip trust-strip--premium" aria-labelledby="trust-heading">
        <div className="trust-strip__copy">
          <h2 id="trust-heading">Güven ve şeffaflık</h2>
          <p>
            SLA, durum sayfası ve iletişim kanalları her zaman erişilebilir.
          </p>
        </div>
        <div className="trust-links">
          <a href="/sss">Sık sorulan sorular</a>
          <a href="/sla">Hizmet düzeyi (SLA)</a>
          <a href="/durum">Canlı durum</a>
          <a href="/iletisim">İletişim</a>
        </div>
      </section>
    </MarketingPageShell>
  );
}
