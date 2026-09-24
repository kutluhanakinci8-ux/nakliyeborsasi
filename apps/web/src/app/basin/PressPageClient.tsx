"use client";

import Image from "next/image";
import Link from "next/link";
import { PublicPageShell } from "../../components/PublicPageShell";
import { SiteLayout } from "../../components/SiteLayout";

const PAGE_SUBNAV = [
  { href: "#bultenler", label: "Bültenler" },
  { href: "#basin-kiti", label: "Basın kiti" },
  { href: "#konular", label: "Odak konular" },
  { href: "#iletisim", label: "Medya iletişim" },
] as const;

const HERO_STATS = [
  { value: "TR · UA · EU", label: "Koridor haberleri", highlight: true },
  { value: "4 dil", label: "Basın materyali" },
  { value: "7/24", label: "Demo platform" },
] as const;

const PRESS_RELEASES = [
  {
    date: "2026-09-10",
    tag: "Platform",
    title: "Lerta Logistics demo platformu TR–UA koridorunda açıldı",
    summary:
      "Marketplace, ihale, mesajlaşma ve güven modülleri tek kurumsal hesapta birleştirildi. Pilot firmalar için web kaynaklı organizasyon profili zenginleştirme devreye alındı.",
    featured: true,
  },
  {
    date: "2026-08-05",
    tag: "Entegrasyon",
    title: "Harici adapter: Lardi ve Della veri birleştirme",
    summary:
      "Çoklu nakliye borsası kaynaklarından gelen teklifler normalize edilerek tek arama deneyiminde sunuluyor.",
    featured: false,
  },
  {
    date: "2026-07-12",
    tag: "Ürün",
    title: "Çok dilli arayüz: TR, EN, UK, RU",
    summary:
      "Koridor operasyonları için API ve web katmanında locale desteği tamamlandı; basın ve yatırımcı materyalleri çok dilli yayına hazır.",
    featured: false,
  },
] as const;

const PRESS_KIT_ITEMS = [
  {
    title: "Kurumsal özet (boilerplate)",
    body:
      "Lerta Logistics, Türkiye — Ukrayna — Avrupa Birliği koridorunda yük verenleri, taşıyıcıları ve forwarder’ları tek dijital borsada buluşturan kurumsal bir platformdur.",
  },
  {
    title: "Logo ve görsel kimlik",
    body:
      "LL monogramı ve yeşil–lacivert kurumsal palet. Vektör logo talebi için medya hattımıza yazın.",
  },
  {
    title: "Ekran görüntüleri",
    body:
      "Marketplace, ihale, güven merkezi ve admin organizasyon paneli için güncel demo görselleri talep üzerine paylaşılır.",
  },
] as const;

const FOCUS_TOPICS = [
  "Dijital nakliye borsası",
  "TR · UA · EU koridoru",
  "Güven skoru ve doğrulama",
  "Harici borsa entegrasyonu",
  "Kurumsal üyelik ve KVKK",
  "Lojistikte şeffaf fiyatlandırma",
] as const;

const MEDIA_CONTACT = {
  email: "lertalogistics@gmail.com",
  note: "Röportaj, demo ve basın kiti talepleri için 48 saat içinde dönüş hedeflenir.",
};

export function PressPageClient() {
  const featured = PRESS_RELEASES.find((item) => item.featured) ?? PRESS_RELEASES[0];
  const rest = PRESS_RELEASES.filter((item) => item !== featured);

  return (
    <SiteLayout headerVariant="public">
      <PublicPageShell
        pageClassName="press-premium-page about-premium-page"
        breadcrumbLabel="Basın"
        eyebrow="Medya merkezi"
        title="Basın ve kurumsal iletişim"
        lead="Lerta Logistics hakkında güncel duyurular, ürün haberleri ve koridor odaklı basın materyalleri. Medya temsilcileri için basın kiti ve doğrudan iletişim kanalı."
        stats={[...HERO_STATS]}
        subnav={PAGE_SUBNAV}
        heroAside={
          <div className="about-premium-hero-visual press-premium-hero-visual">
            <Image
              src="/media/press/press-hero-briefing.jpg"
              alt="Kurumsal basın toplantısı ve medya ortamı"
              width={640}
              height={360}
              priority
              className="about-premium-hero-photo"
            />
            <div className="about-premium-hero-badge press-premium-hero-badge" aria-hidden>
              <span className="about-premium-hero-badge-dot" />
              Basın bültenleri · 2026
            </div>
          </div>
        }
      >
        <section id="bultenler" className="press-premium-releases module-panel">
          <header className="about-premium-section-head press-premium-section-head--left">
            <p className="about-premium-kicker">Basın bültenleri</p>
            <h2 className="about-premium-h2">Son duyurular</h2>
          </header>

          <article className="press-premium-featured">
            <div className="press-premium-featured-media">
              <Image
                src="/media/press/press-release-logistics.jpg"
                alt=""
                width={560}
                height={420}
                className="about-premium-photo"
                aria-hidden
              />
            </div>
            <div className="press-premium-featured-copy">
              <span className="press-premium-tag">{featured.tag}</span>
              <time className="press-premium-date" dateTime={featured.date}>
                {new Date(featured.date).toLocaleDateString("tr-TR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </time>
              <h3>{featured.title}</h3>
              <p>{featured.summary}</p>
            </div>
          </article>

          <ul className="press-premium-release-grid">
            {rest.map((item) => (
              <li key={item.title}>
                <article className="press-premium-release-card">
                  <span className="press-premium-tag">{item.tag}</span>
                  <time className="press-premium-date" dateTime={item.date}>
                    {new Date(item.date).toLocaleDateString("tr-TR")}
                  </time>
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>
                </article>
              </li>
            ))}
          </ul>
        </section>

        <section id="basin-kiti" className="press-premium-kit module-panel">
          <div className="press-premium-kit-grid">
            <div>
              <p className="about-premium-kicker">Basın kiti</p>
              <h2 className="about-premium-h2">Medya için hazır materyaller</h2>
              <p className="about-premium-body">
                Haber metinleri, kurumsal tanım ve görsel talepleri için standart paketimiz.
                Tam logo dosyaları ve yüksek çözünürlüklü ekran görüntüleri e-posta ile
                gönderilir.
              </p>
              <ul className="press-premium-kit-list">
                {PRESS_KIT_ITEMS.map((item) => (
                  <li key={item.title}>
                    <strong>{item.title}</strong>
                    <p>{item.body}</p>
                  </li>
                ))}
              </ul>
              <Link href="/hakkimizda" className="press-premium-inline-link">
                Kurumsal kimlik sayfası →
              </Link>
            </div>
            <figure className="about-premium-figure about-premium-figure--flush">
              <Image
                src="/media/press/press-media-kit.jpg"
                alt="Basın kiti: dizüstü bilgisayar, not defteri ve medya ekipmanları"
                width={560}
                height={315}
                className="about-premium-photo"
              />
            </figure>
          </div>
        </section>

        <section id="konular" className="press-premium-topics module-panel">
          <header className="about-premium-section-head">
            <p className="about-premium-kicker">Odak konular</p>
            <h2 className="about-premium-h2">Hangi başlıklarda konuşuyoruz?</h2>
            <p className="about-premium-body about-premium-body--centered">
              Röportaj ve analiz taleplerinde uzman görüşü sunabileceğimiz temalar.
            </p>
          </header>
          <ul className="press-premium-topic-chips">
            {FOCUS_TOPICS.map((topic) => (
              <li key={topic}>{topic}</li>
            ))}
          </ul>
          <blockquote className="press-premium-quote">
            <p>
              “Koridor lojistiğinde şeffaflık, güven ve entegrasyon artık aynı platformda
              buluşmalı — basın ve sektör bunu birlikte anlatmalı.”
            </p>
            <footer>— Kurumsal iletişim, Lerta Logistics</footer>
          </blockquote>
        </section>

        <section id="iletisim" className="about-premium-cta module-panel press-premium-contact">
          <div className="about-premium-cta-inner">
            <div>
              <h2 className="about-premium-h2">Medya iletişim</h2>
              <p className="about-premium-body">{MEDIA_CONTACT.note}</p>
              <p className="press-premium-email">
                <a href={`mailto:${MEDIA_CONTACT.email}`}>{MEDIA_CONTACT.email}</a>
              </p>
            </div>
            <div className="about-premium-cta-actions">
              <Link href="/iletisim" className="btn-gold-wide about-premium-cta-primary">
                İletişim formu
              </Link>
              <Link href="/login?mode=register" className="about-premium-cta-secondary">
                Demo talebi
              </Link>
            </div>
          </div>
        </section>
      </PublicPageShell>
    </SiteLayout>
  );
}
