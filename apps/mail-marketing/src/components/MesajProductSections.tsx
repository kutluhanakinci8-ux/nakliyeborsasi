import {
  MESAJ_CHANNELS,
  MESAJ_FEATURES,
  MESAJ_HERO_STATS,
  MESAJ_STEPS,
} from "@/lib/mesajProductContent";
import { MESSAGING_APP_URL, MESSAGING_LOGIN_URL } from "@/lib/marketingUrls";
import { MarketingIcon } from "./MarketingIcons";

export function MesajHeroSection() {
  return (
    <section className="posta-hero mesaj-hero" aria-labelledby="mesaj-hero-title">
      <div className="posta-hero__copy">
        <p className="premium-eyebrow premium-eyebrow--posta">
          <MarketingIcon name="mail" className="premium-icon premium-icon--sm" />
          Firma sohbeti · Lerta Mesaj
        </p>
        <h1 id="mesaj-hero-title" className="posta-hero__title">
          Kurumsal mesajlaşma,{" "}
          <span className="premium-gradient-text">kanal köprüleriyle</span>
        </h1>
        <p className="posta-hero__lead">
          Ekip içi sohbet, dosya paylaşımı, bildirimler ve entegrasyon API&apos;si.
          WhatsApp ve Slack köprüleri ile müşteri iletişimini tek yerde toplayın.
        </p>
        <div className="premium-hero__cta posta-hero__cta">
          <a
            className="btn btn-primary btn-lg posta-btn-primary"
            href={MESSAGING_LOGIN_URL}
          >
            Giriş yap
          </a>
          <a
            className="btn btn-ghost btn-lg posta-btn-secondary"
            href={MESSAGING_APP_URL}
          >
            Sohbeti aç
          </a>
          <a className="btn btn-ghost btn-lg posta-btn-secondary" href="#mesaj-kanallar">
            Kanalları gör
          </a>
        </div>
        <p className="posta-hero__meta">
          Üst menüdeki <strong>Giriş yap</strong> ve <strong>Sohbeti aç</strong>{" "}
          yalnızca Lerta Mesaj&apos;a gider — lojistik veya nakliye arayüzü açılmaz.
        </p>
      </div>
      <div className="posta-hero__panel">
        <div className="posta-stats">
          {MESAJ_HERO_STATS.map((s) => (
            <div key={s.label} className="posta-stat">
              <span className="posta-stat__value">{s.value}</span>
              <span className="posta-stat__label">{s.label}</span>
            </div>
          ))}
        </div>
        <div className="posta-hero__showcase" aria-hidden="true">
          <img
            className="posta-hero__loop"
            src="/brand/lerta-falcon-hero-loop.gif?v=1"
            width={360}
            height={202}
            alt=""
            decoding="async"
            draggable={false}
          />
        </div>
      </div>
    </section>
  );
}

export function MesajChannelsSection() {
  return (
    <section
      className="mesaj-channels"
      id="mesaj-kanallar"
      aria-labelledby="mesaj-channels-title"
    >
      <div className="section-head section-head--center">
        <h2 id="mesaj-channels-title" className="section-title section-title--lg">
          Tek platform, çoklu kanal
        </h2>
        <p className="section-lead section-lead--wide">
          İç iletişimden müşteri köprülerine — entegrasyonlar kiracı bazında
          yönetilir.
        </p>
      </div>
      <ul className="mesaj-channel-pills">
        {MESAJ_CHANNELS.map((label) => (
          <li key={label}>{label}</li>
        ))}
      </ul>
    </section>
  );
}

export function MesajFeaturesSection() {
  return (
    <section className="posta-section" aria-labelledby="mesaj-features-title">
      <div className="section-head section-head--center">
        <h2 id="mesaj-features-title" className="section-title section-title--lg">
          Kurumsal mesajlaşma için tam paket
        </h2>
        <p className="section-lead section-lead--wide">
          Gerçek zamanlı sohbetten denetlenebilir kayıtlara — Lerta Mesaj,
          Türkiye&apos;de barındırılan altyapıda çalışır.
        </p>
      </div>
      <div className="posta-feature-grid">
        {MESAJ_FEATURES.map((f) => (
          <article key={f.title} className="posta-feature-card">
            <span className="posta-feature-card__icon" aria-hidden="true">
              <MarketingIcon name={f.icon} className="premium-icon" />
            </span>
            <h3>{f.title}</h3>
            <p>{f.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function MesajStepsSection() {
  return (
    <section
      className="posta-section posta-section--soft"
      aria-labelledby="mesaj-steps-title"
    >
      <div className="section-head section-head--center">
        <h2 id="mesaj-steps-title" className="section-title section-title--lg">
          Dakikalar içinde ekibe bağlayın
        </h2>
        <p className="section-lead">
          Davet, kanal ve köprü kurulumu panel üzerinden; IT ve operasyon için net
          runbook.
        </p>
      </div>
      <ol className="posta-steps">
        {MESAJ_STEPS.map((s) => (
          <li key={s.step} className="posta-step">
            <span className="posta-step__num">{s.step}</span>
            <div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function MesajPlansSection() {
  return (
    <section
      className="posta-section pricing pricing--posta mesaj-plans"
      id="planlar"
      aria-labelledby="mesaj-plans-title"
    >
      <div className="section-head section-head--center">
        <h2 id="mesaj-plans-title" className="section-title section-title--lg">
          Planlar ve erişim
        </h2>
        <p className="section-lead section-lead--wide pricing-lead">
          Lerta Mesaj, kurumsal kiracı modeliyle sunulur. Ekip lisansları ve
          köprü paketleri için{" "}
          <a href="/posta#fiyatlar">Lerta Posta planları</a> ile birlikte veya
          ayrı satış kanalı üzerinden teklif alın.
        </p>
      </div>
      <div className="posta-feature-grid mesaj-plans__grid">
        <article className="posta-feature-card price-card">
          <h3>Ekip erişimi</h3>
          <p className="price-period">
            Mevcut kurumsal hesabınızla giriş; kanallar ve köprüler panelden
            yapılandırılır.
          </p>
          <a className="btn btn-primary posta-btn-primary" href={MESSAGING_LOGIN_URL}>
            Giriş yap
          </a>
        </article>
        <article className="posta-feature-card price-card highlight">
          <h3>Canlı sohbet</h3>
          <p className="price-period">
            Web ve mobil arayüz; dosya, bildirim ve entegrasyon API&apos;si.
          </p>
          <a className="btn btn-primary posta-btn-primary" href={MESSAGING_APP_URL}>
            Sohbeti aç
          </a>
        </article>
        <article className="posta-feature-card price-card">
          <h3>Kurumsal teklif</h3>
          <p className="price-period">
            Çok kiracılı yapı, SLA ve uyum gereksinimleri için satış ekibi.
          </p>
          <a className="btn btn-ghost posta-btn-secondary" href="/iletisim">
            İletişime geçin
          </a>
        </article>
      </div>
    </section>
  );
}

export function MesajCtaBand() {
  return (
    <section
      className="posta-cta-band posta-cta-band--showcase"
      aria-label="Lerta marka animasyonu"
    >
      <div className="posta-cta-band__showcase-frame">
        <img
          className="posta-cta-band__loop"
          src="/brand/lerta-falcon-loop.gif?v=1"
          width={360}
          height={202}
          alt=""
          decoding="async"
          draggable={false}
        />
      </div>
    </section>
  );
}
