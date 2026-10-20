import Link from "next/link";
import type { ReactNode } from "react";

export type MailRegisterPlan =
  | "lerta_mail_pilot_tr"
  | "lerta_mail_corporate_tr";

const PLATFORM_LINKS = [
  { href: "https://www.lerta.com.tr/posta", label: "Posta" },
  { href: "https://www.lerta.com.tr/mesaj", label: "Mesajlaşma" },
  { href: "https://www.lerta.com.tr/u88", label: "KVKK" },
] as const;

export function AuthPremiumShell({
  plan,
  children,
  footerExtra,
}: {
  plan: MailRegisterPlan;
  children: ReactNode;
  footerExtra?: ReactNode;
}) {
  const isPilot = plan === "lerta_mail_pilot_tr";

  return (
    <div className="auth-premium-page">
      <header className="auth-premium-header">
        <a
          className="auth-premium-brand"
          href="https://www.lerta.com.tr/posta"
          aria-label="Lerta Posta"
        >
          <span className="auth-premium-brand-mark" aria-hidden="true">L</span>
          <span className="auth-premium-brand-text">
            <span className="auth-premium-brand-name">Lerta Yönetim</span>
            <span className="auth-premium-brand-tag">Posta konsolu</span>
          </span>
        </a>
        <nav className="auth-premium-nav" aria-label="Lerta platform">
          {PLATFORM_LINKS.map((item) => (
            <a key={item.href} href={item.href} className="auth-premium-nav-link">
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <main className="auth-premium-main">
        <section
          className="auth-premium-showcase"
          aria-labelledby="auth-showcase-title"
        >
          <p className="auth-premium-eyebrow">
            {isPilot ? "Pilot plan" : "Kurumsal plan"}
          </p>
          <h1 id="auth-showcase-title" className="auth-premium-title">
            {isPilot
              ? "Dakikalar içinde pilot posta kutusu"
              : "Özel alan adınızla kurumsal posta"}
          </h1>
          <p className="auth-premium-lead">
            {isPilot
              ? "Tek kutu, 80 gönderim/saat ve 2 GB depolama. Kayıt sonrası webmail’e otomatik yönlendirme."
              : "Kayıt sonrası domain sihirbazı, DNS doğrulama ve çoklu kutu yönetimi."}
          </p>
          <ul className="auth-premium-features">
            {isPilot ? (
              <>
                <li>
                  <span className="auth-premium-check" aria-hidden="true">✓</span>
                  <span>
                    <strong>@lerta.com.tr</strong> pilot adresi seçimi
                  </span>
                </li>
                <li>
                  <span className="auth-premium-check" aria-hidden="true">✓</span>
                  <span>Ücretsiz başlangıç — plan yükseltme isteğe bağlı</span>
                </li>
                <li>
                  <span className="auth-premium-check" aria-hidden="true">✓</span>
                  <span>posta.lerta.com.tr webmail erişimi</span>
                </li>
              </>
            ) : (
              <>
                <li>
                  <span className="auth-premium-check" aria-hidden="true">✓</span>
                  <span>
                    <strong>info@sirketiniz.com</strong> ve ek kutular
                  </span>
                </li>
                <li>
                  <span className="auth-premium-check" aria-hidden="true">✓</span>
                  <span>MX, SPF, DKIM, DMARC paneli</span>
                </li>
                <li>
                  <span className="auth-premium-check" aria-hidden="true">✓</span>
                  <span>Ekip daveti ve kota yönetimi</span>
                </li>
              </>
            )}
          </ul>
          <p className="auth-premium-trust">
            <a href="https://posta.lerta.com.tr/login">Webmail girişi</a>
            <span aria-hidden="true"> · </span>
            <Link href="/login">Mevcut hesap</Link>
          </p>
        </section>

        <section className="auth-premium-panel" aria-label="Kayıt formu">
          <div className="auth-premium-panel-inner">
            <div
              className="auth-premium-plan-tabs"
              role="tablist"
              aria-label="Kayıt planı"
            >
              <Link
                href="/register?plan=lerta_mail_pilot_tr"
                className={
                  isPilot ? "auth-premium-plan-tab is-active" : "auth-premium-plan-tab"
                }
                role="tab"
                aria-selected={isPilot}
              >
                Pilot / bireysel
              </Link>
              <Link
                href="/register?plan=lerta_mail_corporate_tr"
                className={
                  !isPilot
                    ? "auth-premium-plan-tab is-active"
                    : "auth-premium-plan-tab"
                }
                role="tab"
                aria-selected={!isPilot}
              >
                Kurumsal domain
              </Link>
            </div>
            {children}
            {footerExtra}
          </div>
        </section>
      </main>

      <footer className="auth-premium-footer">
        <span>© {new Date().getFullYear()} Lerta · Posta yönetim</span>
        <a href="https://www.lerta.com.tr/durum">Durum</a>
        <a href="https://www.lerta.com.tr/kvkk">KVKK</a>
      </footer>
    </div>
  );
}
