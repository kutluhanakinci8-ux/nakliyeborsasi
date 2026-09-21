import Link from "next/link";
import { CorporatePageLayout } from "../../components/CorporatePageLayout";
import { PLATFORM_NAV_ITEMS } from "../../lib/siteNavigation";

const SERVICES = [
  {
    title: "Yük arama ve ilan yönetimi",
    body: "TR, UA ve AB koridorunda ilan arayın, filtreleyin ve platform fiyatlarıyla karşılaştırın.",
    href: "/marketplace",
  },
  {
    title: "İhale ve teklif oturumları",
    body: "Minimum teklif, süre ve para birimi ile şeffaf ihale açın veya teklif verin.",
    href: "/auctions",
  },
  {
    title: "Firma mesajlaşması",
    body: "Taşıyıcı ve yük veren arasında kayıtlı, güvenli mesaj kanalları.",
    href: "/messaging",
  },
  {
    title: "Güven merkezi",
    body: "Ortalama puan, değerlendirme sayısı ve partner geri bildirimleri.",
    href: "/trust",
  },
  {
    title: "Harici borsa entegrasyonu",
    body: "Lardi, Della, DAT ve diğer kaynaklardan normalize teklif akışı.",
    href: "/integrations",
  },
] as const;

export default function HizmetlerPage() {
  return (
    <CorporatePageLayout
      eyebrow="Hizmetler"
      title="Taşımacılık borsası hizmetleri"
      lead="Lardi ve Della tarzı platformlarda gördüğünüz modüllerin tamamı Nakliye Borsası’nda — tek hesap, tek koridor."
    >
      <div className="corporate-grid">
        {SERVICES.map((service) => (
          <article key={service.href} className="corporate-card">
            <h2>{service.title}</h2>
            <p>{service.body}</p>
            <Link href={service.href} className="corporate-card-link">
              Modüle git →
            </Link>
          </article>
        ))}
      </div>
      <section className="module-panel corporate-cta">
        <h2 className="module-panel-title">Platform menüsü</h2>
        <ul className="corporate-inline-links">
          {PLATFORM_NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link href={item.href}>{item.label}</Link>
            </li>
          ))}
        </ul>
      </section>
    </CorporatePageLayout>
  );
}
