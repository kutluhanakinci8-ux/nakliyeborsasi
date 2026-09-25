const consoleUrl =
  process.env.NEXT_PUBLIC_CONSOLE_URL ?? "https://yonetim.lerta.com.tr";
const webmailUrl =
  process.env.NEXT_PUBLIC_MAIL_WEB_URL ?? "https://posta.lerta.com.tr";

export default function MarketingHomePage() {
  const registerHref = `${consoleUrl.replace(/\/$/, "")}/register`;
  const loginHref = `${webmailUrl.replace(/\/$/, "")}/login`;
  const consoleLoginHref = `${consoleUrl.replace(/\/$/, "")}/login`;

  return (
    <div className="landing">
      <div className="wrap">
        <header>
          <div className="brand">Lerta Mail</div>
          <nav className="nav-links">
            <a className="btn btn-ghost" href={loginHref}>Webmail giriş</a>
            <a className="btn btn-primary" href={registerHref}>Ücretsiz başla</a>
          </nav>
        </header>

        <section className="hero">
          <h1>Kurumsal posta, sizin domaininizde</h1>
          <p className="lead">
            Gmail benzeri webmail, güvenli gönderim ve DNS sihirbazı ile dakikalar
            içinde kutunuzu açın. Lerta Logistics’ten bağımsız, tam SaaS ürün.
          </p>
          <div className="hero-cta">
            <a className="btn btn-primary" href={registerHref}>
              Hesap oluştur
            </a>
            <a className="btn btn-ghost" href={consoleLoginHref}>
              Yönetim konsolu
            </a>
          </div>
        </section>

        <section className="grid">
          <article className="card">
            <h3>Özel domain</h3>
            <p>
              MX, SPF, DKIM ve DMARC adımlarını panelden takip edin; doğrulama
              sonrası kurumsal adreslerinizi kullanın.
            </p>
          </article>
          <article className="card">
            <h3>Webmail</h3>
            <p>
              Gelen kutusu, gönderilenler ve yanıtla —{" "}
              <a href={loginHref}>posta.lerta.com.tr</a> üzerinden.
            </p>
          </article>
          <article className="card">
            <h3>Kendi altyapımız</h3>
            <p>
              Postfix, OpenDKIM ve Rspamd ile teslimat; verileriniz tek VPS
              üzerinde izole kiracı modeliyle.
            </p>
          </article>
        </section>

        <footer>
          © {new Date().getFullYear()} Lerta Mail · Pilot: kullanici.lerta.com.tr ·
          Logistics ürünü ayrı domain: lerta.tr
        </footer>
      </div>
    </div>
  );
}
