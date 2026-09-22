"use client";

import Image from "next/image";
import Link from "next/link";
import { PublicPageShell } from "../../components/PublicPageShell";
import { SiteLayout } from "../../components/SiteLayout";

const PAGE_SUBNAV = [
  { href: "#neden", label: "Neden biz" },
  { href: "#pozisyonlar", label: "Açık pozisyonlar" },
  { href: "#surec", label: "Başvuru süreci" },
  { href: "#basvuru", label: "Başvur" },
] as const;

const HERO_STATS = [
  { value: "3+", label: "Açık rol", highlight: true },
  { value: "Uzaktan", label: "TR · UA uyumlu" },
  { value: "Koridor", label: "Lojistik × teknoloji" },
] as const;

const WHY_JOIN = [
  {
    title: "Anlamlı ürün",
    body:
      "TR — UA — EU koridorunda gerçek taşımacılık problemlerine çözüm üretiyoruz; kodunuz ve operasyonunuz doğrudan sahaya dokunuyor.",
    icon: "◆",
  },
  {
    title: "Modüler mimari",
    body:
      "NestJS, Next.js ve entegrasyon katmanı ile ölçeklenebilir platform; teknik borç yerine net sınırlar ve test edilebilir servisler.",
    icon: "◇",
  },
  {
    title: "Hibrit ve uzaktan",
    body:
      "İstanbul, Kyiv ve uzaktan ekipler; koridor saat dilimlerine uygun iş birliği ve async-friendly süreçler.",
    icon: "◎",
  },
  {
    title: "Büyüme alanı",
    body:
      "Erken aşama ürün: ürün, operasyon ve iş geliştirme rollerinde sorumluluk ve görünürlük yüksek.",
    icon: "◈",
  },
] as const;

const OPENINGS = [
  {
    title: "Full-stack geliştirici (NestJS / Next.js)",
    location: "Uzaktan · TR / UA",
    type: "Tam zamanlı",
    team: "Ürün & mühendislik",
    summary:
      "Marketplace, ihale, güven ve admin modüllerinde TypeScript ile uçtan uca geliştirme. API tasarımı ve kurumsal UX deneyimi artı.",
  },
  {
    title: "Koridor operasyon uzmanı",
    location: "İstanbul / Kyiv",
    type: "Hibrit",
    team: "Operasyon",
    summary:
      "Pilot müşteri süreçleri, firma doğrulama ve koridor içi operasyon akışlarının ürünle hizalanması.",
  },
  {
    title: "İş geliştirme — lojistik partnerleri",
    location: "AB + Türkiye",
    type: "Tam zamanlı",
    team: "İş geliştirme",
    summary:
      "Taşıyıcı, yük veren ve entegrasyon partnerleri ile pipeline; demo ve kurumsal üyelik dönüşümü.",
  },
] as const;

const HIRING_STEPS = [
  {
    step: "01",
    title: "Başvuru",
    body: "İletişim formu veya e-posta ile CV ve kısa motivasyon notu.",
  },
  {
    step: "02",
    title: "Tanışma",
    body: "30 dakikalık video görüşme: rol, koridor vizyonu ve beklentiler.",
  },
  {
    step: "03",
    title: "Teknik / vaka",
    body: "Rolüne göre kod incelemesi, ürün senaryosu veya operasyon vaka çalışması.",
  },
  {
    step: "04",
    title: "Teklif",
    body: "Ekip uyumu sonrası net paket, başlangıç tarihi ve onboarding planı.",
  },
] as const;

export function CareerPageClient() {
  return (
    <SiteLayout headerVariant="public">
      <PublicPageShell
        pageClassName="career-premium-page about-premium-page"
        breadcrumbLabel="Kariyer"
        eyebrow="İnsan kaynakları"
        title="Ekibimize katılın"
        lead="Lojistik teknolojisine tutkuyla bağlı ürün, mühendislik ve operasyon ekiplerimiz büyüyor. Koridor odaklı dijital nakliye borsasında birlikte inşa edelim."
        stats={[...HERO_STATS]}
        subnav={PAGE_SUBNAV}
        heroAside={
          <div className="about-premium-hero-visual">
            <Image
              src="/media/career/career-hero-team.jpg"
              alt="Nakliye Borsası ekibi modern ofiste iş birliği yapıyor"
              width={640}
              height={360}
              priority
              className="about-premium-hero-photo"
            />
            <div className="about-premium-hero-badge" aria-hidden>
              <span className="about-premium-hero-badge-dot" />
              Açık pozisyonlar · 2026
            </div>
          </div>
        }
      >
        <section id="neden" className="career-premium-why module-panel">
          <div className="career-premium-why-grid">
            <div>
              <p className="about-premium-kicker">Neden Nakliye Borsası?</p>
              <h2 className="about-premium-h2">Koridorun dijital omurgasını kuruyoruz</h2>
              <p className="about-premium-body">
                Sadece bir ilan sitesi değil; güven, ihale, mesajlaşma ve harici borsa
                entegrasyonunu tek kurumsal hesapta toplayan platform. Burada yazdığınız kod ve
                kurguladığınız süreç doğrudan taşımacılık ekosistemine hizmet eder.
              </p>
              <div className="about-premium-values-grid career-premium-perks-grid">
                {WHY_JOIN.map((item) => (
                  <article key={item.title} className="about-premium-value-card">
                    <span className="about-premium-value-icon" aria-hidden>{item.icon}</span>
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </article>
                ))}
              </div>
            </div>
            <figure className="about-premium-figure about-premium-figure--flush">
              <Image
                src="/media/career/career-culture-work.jpg"
                alt="Mühendislik ve operasyon ekibi birlikte çalışıyor"
                width={520}
                height={390}
                className="about-premium-photo"
              />
              <figcaption className="about-premium-caption">
                Ürün, operasyon ve entegrasyon tek masada.
              </figcaption>
            </figure>
          </div>
        </section>

        <section id="pozisyonlar" className="career-premium-jobs module-panel">
          <header className="press-premium-section-head--left about-premium-section-head press-premium-section-head--left">
            <p className="about-premium-kicker">Açık pozisyonlar</p>
            <h2 className="about-premium-h2">Şu an aradığımız roller</h2>
            <p className="about-premium-body">
              Tüm başvurular değerlendirilir; uygun olmasa bile yetenek havuzumuzda tutulur.
            </p>
          </header>
          <ul className="career-premium-job-list">
            {OPENINGS.map((job) => (
              <li key={job.title}>
                <article className="career-premium-job-card">
                  <div className="career-premium-job-head">
                    <span className="press-premium-tag">{job.team}</span>
                    <h3>{job.title}</h3>
                    <p className="career-premium-job-meta">
                      <span>{job.location}</span>
                      <span aria-hidden>·</span>
                      <span>{job.type}</span>
                    </p>
                  </div>
                  <p className="career-premium-job-summary">{job.summary}</p>
                  <Link href="/iletisim" className="press-premium-inline-link">
                    Bu role başvur →
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        </section>

        <section id="surec" className="career-premium-process module-panel">
          <div className="career-premium-process-grid">
            <div>
              <p className="about-premium-kicker">Başvuru süreci</p>
              <h2 className="about-premium-h2">Şeffaf ve hızlı adımlar</h2>
              <p className="about-premium-body">
                Ortalama süreç 2–3 hafta; acil rollerde daha kısa. Her aşamada geri bildirim
                vermeyi hedefliyoruz.
              </p>
              <ol className="career-premium-steps">
                {HIRING_STEPS.map((item) => (
                  <li key={item.step}>
                    <span className="career-premium-step-num">{item.step}</span>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <figure className="about-premium-figure about-premium-figure--flush">
              <Image
                src="/media/career/career-growth-corridor.jpg"
                alt="Koridor lojistiği ve kariyer gelişimi"
                width={560}
                height={315}
                className="about-premium-photo"
              />
            </figure>
          </div>
        </section>

        <section id="basvuru" className="about-premium-cta module-panel career-premium-cta">
          <div className="about-premium-cta-inner">
            <div>
              <h2 className="about-premium-h2">Haydi tanışalım</h2>
              <p className="about-premium-body">
                Açık pozisyonlardan biri size uygun değilse genel başvuru da gönderebilirsiniz.
                CV ve LinkedIn profilinizi iletişim formuna ekleyin.
              </p>
            </div>
            <div className="about-premium-cta-actions">
              <Link href="/iletisim" className="btn-gold-wide about-premium-cta-primary">
                Başvuru gönder
              </Link>
              <Link href="/hakkimizda" className="about-premium-cta-secondary">
                Biz kimiz?
              </Link>
            </div>
          </div>
        </section>
      </PublicPageShell>
    </SiteLayout>
  );
}
