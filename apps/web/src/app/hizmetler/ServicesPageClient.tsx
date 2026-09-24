"use client";

import Image from "next/image";
import Link from "next/link";
import { PublicPageShell } from "../../components/PublicPageShell";
import { SiteLayout } from "../../components/SiteLayout";
import { PLATFORM_NAV_ITEMS } from "../../lib/siteNavigation";

const PAGE_SUBNAV = [
  { href: "#vizyon", label: "Vizyon" },
  { href: "#platform", label: "Platform modülleri" },
  { href: "#kurumsal", label: "Kurumsal yetenekler" },
  { href: "#yol-haritasi", label: "Yol haritası" },
] as const;

const HERO_STATS = [
  { value: "8+", label: "Hizmet alanı", highlight: true },
  { value: "TR · UA · EU", label: "Koridor" },
  { value: "Tek hesap", label: "Tüm modüller" },
] as const;

type ServiceItem = {
  title: string;
  lead: string;
  body: string;
  href: string;
  cta: string;
  image: string;
  tag: string;
};

const PLATFORM_SERVICES: ServiceItem[] = [
  {
    tag: "Marketplace",
    title: "Yük arama ve ilan yönetimi",
    lead: "Koridor genelinde ilanları tek ekranda arayın, filtreleyin ve karşılaştırın.",
    body:
      "Yük veren ve taşıyıcı rolleri için aynı veri modeli: köken, varış, araç tipi ve fiyat beklentisi. TR, UA ve AB hatlarında demo ilanlarla platformu deneyin; canlıya geçişte filtreler ve bildirimler aynı arayüzde kalır.",
    href: "/marketplace",
    cta: "Yük aramaya git",
    image: "/media/services/services-marketplace.jpg",
  },
  {
    tag: "İhale",
    title: "İhale ve teklif oturumları",
    lead: "Şeffaf süre, minimum teklif ve para birimi kurallarıyla rekabetçi fiyat.",
    body:
      "Açık artırma mantığıyla taşıma kapasitesi ve yük eşleşmesi. Oturum geçmişi kayıtlıdır; güven skoru ve mesajlaşma ile birlikte değerlendirme yapılır. Forwarder ve filo sahipleri için operasyonel şeffaflık.",
    href: "/auctions",
    cta: "İhale modülü",
    image: "/media/services/services-auctions.jpg",
  },
  {
    tag: "Mesajlaşma",
    title: "Kayıtlı firma mesajlaşması",
    lead: "Taşıyıcı ve yük veren arasında platform içi, izlenebilir diyalog.",
    body:
      "E-posta ve telefon trafiğini azaltın; teklif ve sevkiyat detayları firma kimliği altında saklanır. Uyuşmazlık durumunda denetim ve admin operasyonları için kayıt altı kanal.",
    href: "/messaging",
    cta: "Mesajlar",
    image: "/media/services/services-trust-messaging.jpg",
  },
  {
    tag: "Güven",
    title: "Güven merkezi ve partner skoru",
    lead: "Puan, değerlendirme sayısı ve geri bildirimle bilinçli partner seçimi.",
    body:
      "Taşıma kararını yalnızca fiyata değil, güven verisine de dayandırın. Ortalama skor ve yorumlar marketplace ve ihale akışlarıyla entegre; kurumsal itibarınızı platformda görünür kılın.",
    href: "/trust",
    cta: "Güven merkezi",
    image: "/media/services/services-trust-messaging.jpg",
  },
  {
    tag: "Entegrasyon",
    title: "Harici borsa ve API entegrasyonu",
    lead: "Lardi, Della ve benzeri kaynaklardan normalize teklif akışı.",
    body:
      "Adapter katmanı farklı formatları tek arama deneyimine indirger. Kurumsal IT için açık API yol haritası; operasyon ekipleri için daha az sekme, daha hızlı karar.",
    href: "/integrations",
    cta: "Entegrasyonlar",
    image: "/media/services/services-integrations.jpg",
  },
];

const CORPORATE_SERVICES: ServiceItem[] = [
  {
    tag: "Kurumsal üyelik",
    title: "Organizasyon profili ve doğrulama",
    lead: "Firma unvanı, ülke, rol ve resmi kayıt alanları tek profilde.",
    body:
      "Yük veren, taşıyıcı ve arayan rolleriyle kayıt; MERSİS, vergi, KEP ve iletişim bilgileri kurumsal kartlarda. Admin tarafında operatör görünümü ile denetim ve destek süreçleri.",
    href: "/login?mode=register",
    cta: "Kurumsal üyelik",
    image: "/media/services/services-corporate-profile.jpg",
  },
  {
    tag: "Zenginleştirme",
    title: "Web kaynaklı firma zenginleştirme",
    lead: "Üyelik sonrası web sitenizden logo, adres ve sosyal kanıt otomatik.",
    body:
      "Ana sayfa ve iletişim sayfaları taranır; ticari unvan, çalışma saatleri, hizmet özetleri ve sosyal bağlantılar organizasyon profiline işlenir. Operatör müdahalesi gerektirmeden güncel kurumsal görünüm.",
    href: "/hesap/organizasyon",
    cta: "Organizasyonum",
    image: "/media/services/services-corporate-profile.jpg",
  },
  {
    tag: "Koridor UX",
    title: "Çok dilli koridor deneyimi",
    lead: "TR, EN, UK ve RU ile sınır ötesi operasyonlara uygun arayüz.",
    body:
      "Vizyonumuz: bölgesel lider dijital borsa olmak. Dil ve locale desteği API ile web katmanında birlikte ilerler; aynı firma kimliği tüm modüllerde korunur.",
    href: "/hakkimizda#koridor",
    cta: "Koridor vizyonu",
    image: "/media/services/services-hero-platform.jpg",
  },
];

const ROADMAP_ITEMS = [
  {
    title: "Sınır ve uyum",
    body: "Gümrük ve belge akışları platform tasarımına entegre edilecek modüller.",
  },
  {
    title: "Sigorta ve risk",
    body: "Taşıma riski ve poliçe bilgisi ilan ve ihale kartlarına bağlanacak.",
  },
  {
    title: "Filo ve ödeme",
    body: "Araç kapasitesi ve ödeme köprüleri aynı kurumsal hesap altında.",
  },
] as const;

function ServiceCard({ service, featured }: { service: ServiceItem; featured?: boolean }) {
  return (
    <article className={featured ? "services-premium-card services-premium-card--featured" : "services-premium-card"}>
      <Link href={service.href} className="services-premium-card-media">
        <Image src={service.image} alt="" width={480} height={360} />
        <span className="press-premium-tag services-premium-card-tag">{service.tag}</span>
      </Link>
      <div className="services-premium-card-body">
        <h3>{service.title}</h3>
        <p className="services-premium-card-lead">{service.lead}</p>
        <p className="services-premium-card-body-text">{service.body}</p>
        <Link href={service.href} className="press-premium-inline-link">
          {service.cta} →
        </Link>
      </div>
    </article>
  );
}

export function ServicesPageClient() {
  const featured = PLATFORM_SERVICES[0];
  const platformRest = PLATFORM_SERVICES.slice(1);

  return (
    <SiteLayout headerVariant="public">
      <PublicPageShell
        pageClassName="services-premium-page about-premium-page"
        breadcrumbLabel="Hizmetler"
        eyebrow="Platform yetenekleri"
        title="Taşımacılık borsası hizmetleri"
        lead="Tek kurumsal hesapla yük arama, ihale, güven, mesajlaşma ve entegrasyon — üzerine kurumsal profil ve koridor odaklı deneyim. Vizyonumuz: şeffaf fiyat, güvenilir partner, entegre operasyon."
        stats={[...HERO_STATS]}
        subnav={PAGE_SUBNAV}
        heroAside={
          <div className="about-premium-hero-visual">
            <Image
              src="/media/services/services-hero-platform.jpg"
              alt="Lerta Logistics dijital platform görünümü"
              width={640}
              height={360}
              priority
              className="about-premium-hero-photo"
            />
            <div className="about-premium-hero-badge" aria-hidden>
              <span className="about-premium-hero-badge-dot" />
              Modüler · TR · UA · EU
            </div>
          </div>
        }
      >
        <section id="vizyon" className="services-premium-vision module-panel">
          <div className="services-premium-vision-inner">
            <p className="about-premium-kicker">Misyon & vizyon</p>
            <h2 className="about-premium-h2">Operasyonu birleştiren hizmet katmanları</h2>
            <p className="about-premium-body">
              Lerta Logistics, koridor genelinde yük arama, ihale, mesajlaşma ve güven skorunu tek
              platformda sunar; harici borsalarla entegrasyon operasyon yükünü azaltır. Kurumsal
              üyelik ve web zenginleştirme ile firma verisi tek doğruluk kaynağına taşınır.
            </p>
            <p className="about-premium-body">
              Hedefimiz bölgesel lider dijital nakliye borsası olmak: çok dilli deneyim, şeffaf
              fiyat ve ölçülebilir güven. Aşağıdaki modüller bugün demo ve pilot ortamında; yol
              haritası aynı tasarım dilinde genişler.
            </p>
            <Link href="/hakkimizda" className="press-premium-inline-link">
              Hakkımızda ve kurumsal kimlik →
            </Link>
          </div>
        </section>

        <section id="platform" className="services-premium-section module-panel">
          <header className="press-premium-section-head--left about-premium-section-head press-premium-section-head--left">
            <p className="about-premium-kicker">Platform modülleri</p>
            <h2 className="about-premium-h2">Canlı demo modülleri</h2>
            <p className="about-premium-body">
              Lardi ve Della tarzı platformlarda gördüğünüz yetenekler — Lerta Logistics&apos;te
              tek oturum.
            </p>
          </header>
          <div className="services-premium-featured-slot">
            <ServiceCard service={featured} featured />
          </div>
          <div className="services-premium-grid">
            {platformRest.map((service) => (
              <ServiceCard key={service.href + service.title} service={service} />
            ))}
          </div>
        </section>

        <section id="kurumsal" className="services-premium-section module-panel services-premium-section--corporate">
          <header className="about-premium-section-head">
            <p className="about-premium-kicker">Kurumsal yetenekler</p>
            <h2 className="about-premium-h2">Üyelik, profil ve koridor UX</h2>
            <p className="about-premium-body about-premium-body--centered">
              Ürün vizyonunun ayrılmaz parçası: doğrulanmış firma kimliği ve otomatik zenginleştirme.
            </p>
          </header>
          <div className="services-premium-grid services-premium-grid--three">
            {CORPORATE_SERVICES.map((service) => (
              <ServiceCard key={service.title} service={service} />
            ))}
          </div>
        </section>

        <section id="yol-haritasi" className="services-premium-roadmap module-panel">
          <header className="about-premium-section-head">
            <p className="about-premium-kicker">Yol haritası</p>
            <h2 className="about-premium-h2">Yakında aynı platformda</h2>
          </header>
          <ul className="about-premium-timeline services-premium-roadmap-list">
            {ROADMAP_ITEMS.map((item) => (
              <li key={item.title} className="about-premium-timeline-item">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="module-panel services-premium-nav-strip">
          <h2 className="about-premium-h2">Hızlı modül erişimi</h2>
          <ul className="corporate-inline-links services-premium-quick-links">
            {PLATFORM_NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="about-premium-cta module-panel">
          <div className="about-premium-cta-inner">
            <div>
              <h2 className="about-premium-h2">Hizmetleri kurumunuzda deneyin</h2>
              <p className="about-premium-body">
                Kurumsal üyelik açın veya satış ekibimizle görüşün; demo ortamında tüm modülleri
                birlikte test edin.
              </p>
            </div>
            <div className="about-premium-cta-actions">
              <Link href="/login?mode=register" className="btn-gold-wide about-premium-cta-primary">
                Ücretsiz üyelik
              </Link>
              <Link href="/iletisim" className="about-premium-cta-secondary">
                İletişim
              </Link>
            </div>
          </div>
        </section>
      </PublicPageShell>
    </SiteLayout>
  );
}
