"use client";

import Image from "next/image";
import Link from "next/link";
import { PublicPageShell } from "../../components/PublicPageShell";
import { SiteLayout } from "../../components/SiteLayout";

const PAGE_SUBNAV = [
  { href: "#biz-kimiz", label: "Biz kimiz" },
  { href: "#misyon", label: "Misyon" },
  { href: "#vizyon", label: "Vizyon" },
  { href: "#degerler", label: "Değerler" },
  { href: "#koridor", label: "Koridor" },
] as const;

const HERO_STATS = [
  { value: "TR · UA · EU", label: "Koridor odağı", highlight: true },
  { value: "4 dil", label: "TR · EN · UK · RU" },
  { value: "Tek platform", label: "İlan · ihale · güven" },
] as const;

const VALUES = [
  {
    title: "Güven ve şeffaflık",
    body:
      "Firma doğrulama, güven skoru ve kayıtlı mesajlaşma ile taşıma kararlarını veriye dayandırıyoruz.",
    icon: "◆",
  },
  {
    title: "Operasyonel verimlilik",
    body:
      "Yük arama, ihale ve harici borsa entegrasyonları tek hesapta; e-posta ve Excel karmaşasını azaltıyoruz.",
    icon: "◇",
  },
  {
    title: "Koridor uzmanlığı",
    body:
      "Türkiye — Ukrayna — AB hattına özel süreç, dil ve uyum ihtiyaçlarını ürün tasarımının merkezine alıyoruz.",
    icon: "◎",
  },
  {
    title: "Entegrasyon önceliği",
    body:
      "Lardi, Della ve benzeri kaynaklardan normalize teklif akışı; açık API ile kurumsal IT’ye uyum.",
    icon: "◈",
  },
] as const;

const MILESTONES = [
  {
    phase: "Bugün",
    title: "Modüler lojistik platformu",
    body:
      "Yük arama, ihale, mesajlaşma, güven merkezi ve entegrasyon katmanı canlı demo ve pilot müşterilerle.",
  },
  {
    phase: "Yakın",
    title: "Kurumsal profil derinliği",
    body:
      "Web taraması, resmi kayıt alanları, sosyal kanıt ve admin operasyon paneli ile firma verisini tek modelde toplama.",
  },
  {
    phase: "Yol haritası",
    title: "Tam koridor ürünü",
    body:
      "Sınır, sigorta, filo ve ödeme modülleri aynı tasarım dilinde; çok dilli deneyim ve bölgesel ölçek.",
  },
] as const;

export function AboutPageClient() {
  return (
    <SiteLayout headerVariant="public">
        <PublicPageShell
          pageClassName="about-premium-page"
          breadcrumbLabel="Hakkımızda"
          eyebrow="Kurumsal"
          title="Lerta Logistics kimdir?"
          lead="Türkiye, Ukrayna ve Avrupa Birliği koridorunda yük verenleri, taşıyıcıları ve forwarder’ları tek dijital borsada buluşturan kurumsal platformuz. Şeffaf fiyat, güvenilir partner ve entegre operasyon için tasarlandı."
          stats={[...HERO_STATS]}
          subnav={PAGE_SUBNAV}
          heroAside={
            <div className="about-premium-hero-visual">
              <Image
                src="/media/about/about-hero-truck.jpg"
                alt="Avrupa koridorunda modern nakliye filosu"
                width={640}
                height={360}
                priority
                className="about-premium-hero-photo"
              />
              <div className="about-premium-hero-badge" aria-hidden>
                <span className="about-premium-hero-badge-dot" />
                Canlı koridor · TR · UA · EU
              </div>
            </div>
          }
        >
          <section id="biz-kimiz" className="about-premium-intro module-panel">
            <div className="about-premium-intro-grid">
              <div className="about-premium-intro-copy">
                <p className="about-premium-kicker">Biz kimiz</p>
                <h2 className="about-premium-h2">
                  Dijital yük borsası — kurumsal standartta
                </h2>
                <p className="about-premium-body">
                  Lerta Logistics; taşımacılık sektöründe ilan, teklif, ihale ve partner
                  güvenini aynı veri modelinde toplayan bir{" "}
                  <strong>nakliye borsası platformudur</strong>. Küçük filodan uluslararası
                  forwarder’a kadar her ölçekte firma, koridor genelinde aynı arayüz ve aynı
                  güven katmanıyla çalışır.
                </p>
                <p className="about-premium-body">
                  Ürün; üye kaydı, organizasyon profili, web kaynaklı firma zenginleştirme ve
                  platform yönetimi ile uçtan uca bir kurumsal deneyim sunar. Demo ve pilot
                  ortamımız TR · UA · EU hattını simüle eder; canlıya geçişte modüller aynı
                  tasarım dilinde genişler.
                </p>
                <ul className="about-premium-checklist">
                  <li>Kurumsal üyelik ve rol bazlı erişim</li>
                  <li>Çok dilli arayüz (TR, EN, UK, RU)</li>
                  <li>Admin operasyon ve organizasyon görünümü</li>
                </ul>
              </div>
              <figure className="about-premium-figure">
                <Image
                  src="/media/about/about-mission-team.jpg"
                  alt="Lojistik ekibi dijital platform üzerinde iş birliği yapıyor"
                  width={520}
                  height={390}
                  className="about-premium-photo"
                />
                <figcaption className="about-premium-caption">
                  Operasyon ekipleri için tek ekran, tek doğruluk kaynağı.
                </figcaption>
              </figure>
            </div>
          </section>

          <div className="about-premium-mv-grid">
            <section id="misyon" className="about-premium-mv-card module-panel">
              <div className="about-premium-mv-media">
                <Image
                  src="/media/about/about-mission-team.jpg"
                  alt=""
                  width={400}
                  height={280}
                  className="about-premium-mv-photo"
                  aria-hidden
                />
              </div>
              <p className="about-premium-kicker">Misyonumuz</p>
              <h2 className="about-premium-h2">Tek platformda tam operasyon döngüsü</h2>
              <p className="about-premium-body">
                Koridor genelinde yük arama, ihale, mesajlaşma ve güven skorunu bir arada
                sunmak; harici nakliye borsaları ve entegrasyonlarla operasyon yükünü azaltmak.
                Her işlem kayıt altında, her partner ölçülebilir.
              </p>
            </section>

            <section id="vizyon" className="about-premium-mv-card module-panel about-premium-mv-card--vision">
              <div className="about-premium-mv-media about-premium-mv-media--wide">
                <Image
                  src="/media/about/about-vision-corridor.jpg"
                  alt=""
                  width={400}
                  height={220}
                  className="about-premium-mv-photo"
                  aria-hidden
                />
              </div>
              <p className="about-premium-kicker">Vizyonumuz</p>
              <h2 className="about-premium-h2">Bölgesel lider dijital nakliye borsası</h2>
              <p className="about-premium-body">
                Şeffaf fiyat, güvenilir partner ağı ve çok dilli deneyimle Türkiye — Ukrayna —
                AB koridorunun referans platformu olmak. Veri ve entegrasyonla sınır ötesi
                taşımayı sadeleştirmek.
              </p>
            </section>
          </div>

          <section id="degerler" className="about-premium-values module-panel">
            <header className="about-premium-section-head">
              <p className="about-premium-kicker">Değerlerimiz</p>
              <h2 className="about-premium-h2">Ürün ve ortaklık ilkeleri</h2>
            </header>
            <div className="about-premium-values-grid">
              {VALUES.map((item) => (
                <article key={item.title} className="about-premium-value-card">
                  <span className="about-premium-value-icon" aria-hidden>{item.icon}</span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="koridor" className="about-premium-corridor module-panel">
            <div className="about-premium-corridor-grid">
              <div>
                <p className="about-premium-kicker">Koridor odağı</p>
                <h2 className="about-premium-h2">TR · UA · EU — tek harita, tek model</h2>
                <p className="about-premium-body">
                  İlan kökeni ve varışı, güven skoru ve mesajlaşma aynı şirket kimliği
                  üzerinde birleşir. Sınır, sigorta ve filo modülleri yol haritamızda; mevcut
                  modüller bugünün operasyonunu karşılar, yarının genişlemesi için temel atılır.
                </p>
                <div className="about-premium-corridor-tags">
                  <span>Türkiye</span>
                  <span>Ukrayna</span>
                  <span>AB / EU</span>
                  <span>Çok dilli UX</span>
                </div>
              </div>
              <figure className="about-premium-figure about-premium-figure--flush">
                <Image
                  src="/media/about/about-vision-corridor.jpg"
                  alt="Türkiye ve Avrupa arası lojistik bağlantıları görselleştirmesi"
                  width={560}
                  height={315}
                  className="about-premium-photo"
                />
              </figure>
            </div>
          </section>

          <section className="about-premium-roadmap module-panel">
            <header className="about-premium-section-head">
              <p className="about-premium-kicker">Ürün durumu</p>
              <h2 className="about-premium-h2">Bugün ve yol haritası</h2>
              <p className="about-premium-body about-premium-body--centered">
                Platform modüler olarak inşa edildi; her faz aynı kurumsal tasarım ve güven
                katmanına oturur.
              </p>
            </header>
            <ol className="about-premium-timeline">
              {MILESTONES.map((item) => (
                <li key={item.phase} className="about-premium-timeline-item">
                  <span className="about-premium-timeline-phase">{item.phase}</span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="about-premium-cta module-panel">
            <div className="about-premium-cta-inner">
              <div>
                <h2 className="about-premium-h2">Koridorda birlikte çalışalım</h2>
                <p className="about-premium-body">
                  Kurumsal üyelik açın veya ekibimizle iletişime geçin; demo ortamında modülleri
                  canlı deneyin.
                </p>
              </div>
              <div className="about-premium-cta-actions">
                <Link href="/login?mode=register" className="btn-gold-wide about-premium-cta-primary">
                  Kurumsal üyelik
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
