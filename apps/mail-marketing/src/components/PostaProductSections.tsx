import Link from "next/link";
import {
  POSTA_CONSOLE,
  POSTA_FEATURES,
  POSTA_HERO_STATS,
  POSTA_LOGIN,
  POSTA_STEPS,
} from "@/lib/postaProductContent";
import { PLATFORM_REGISTER_HREF } from "@/lib/platformProducts";
import { MarketingIcon } from "./MarketingIcons";

export function PostaHeroSection() {
  return (
    <section className="posta-hero" aria-labelledby="posta-hero-title">
      <div className="posta-hero__copy">
        <p className="premium-eyebrow premium-eyebrow--posta">
          <MarketingIcon name="mail" className="premium-icon premium-icon--sm" />
          Kurumsal e-posta SaaS · 2026
        </p>
        <h1 id="posta-hero-title" className="posta-hero__title">
          Kurumsal posta kutunuz,{" "}
          <span className="premium-gradient-text">alan adınızda</span>
        </h1>
        <p className="posta-hero__lead">
          Özel domain, DNS sihirbazı ve modern webmail tek platformda. Pilot
          deneme veya tam kurumsal geçiş — <strong>info@sizin-domain.com</strong>{" "}
          modeliyle ölçeklenin.
        </p>
        <div className="premium-hero__cta posta-hero__cta">
          <a
            className="btn btn-primary btn-lg posta-btn-primary"
            href={PLATFORM_REGISTER_HREF}
          >
            Domain ile başla
          </a>
          <a className="btn btn-ghost btn-lg posta-btn-secondary" href={POSTA_LOGIN}>
            Webmail giriş
          </a>
          <Link className="btn btn-ghost btn-lg posta-btn-secondary" href="/posta#fiyatlar">
            Planları gör
          </Link>
        </div>
        <p className="posta-hero__meta">
          Yönetim konsolu:{" "}
          <a href={POSTA_CONSOLE}>yonetim.lerta.com.tr</a>
        </p>
      </div>
      <div className="posta-hero__panel">
        <div className="posta-stats">
          {POSTA_HERO_STATS.map((s) => (
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

export function PostaFeaturesSection() {
  return (
    <section className="posta-section" aria-labelledby="posta-features-title">
      <div className="section-head section-head--center">
        <h2 id="posta-features-title" className="section-title section-title--lg">
          Kurumsal posta için tam paket
        </h2>
        <p className="section-lead section-lead--wide">
          Altyapıdan webmail deneyimine — Lerta Posta, Türkiye&apos;de barındırılan
          kiracı modeliyle çalışır.
        </p>
      </div>
      <div className="posta-feature-grid">
        {POSTA_FEATURES.map((f) => (
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

export function PostaStepsSection() {
  return (
    <section className="posta-section posta-section--soft" aria-labelledby="posta-steps-title">
      <div className="section-head section-head--center">
        <h2 id="posta-steps-title" className="section-title section-title--lg">
          Dakikalar içinde canlıya alın
        </h2>
        <p className="section-lead">
          DNS doğrulama ve kutu açılışı panel üzerinden; teknik ekibiniz için
          net runbook.
        </p>
      </div>
      <ol className="posta-steps">
        {POSTA_STEPS.map((s) => (
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

export function PostaCtaBand() {
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
