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
          <h2 id="trust-heading">Güven & uyum</h2>
          <p>
            Türkiye barındırma, SLA taahhütleri ve şeffaf destek kanalları — global
            ölçekte kurumsal beklentilere uygun vitrin.
          </p>
        </div>
        <div className="trust-links">
          <a href="/guven">Güven merkezi</a>
          <a href="/destek">Destek</a>
          <a href="/sla">SLA</a>
          <a href="/sss">SSS</a>
        </div>
      </section>
    </MarketingPageShell>
  );
}
