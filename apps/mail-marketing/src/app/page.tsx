const consoleUrl =
  process.env.NEXT_PUBLIC_CONSOLE_URL ?? "https://yonetim.lerta.com.tr";
const webmailUrl =
  process.env.NEXT_PUBLIC_MAIL_WEB_URL ?? "https://posta.lerta.com.tr";

const PLANS = [
  {
    name: "Pilot",
    price: "Ücretsiz",
    period: "kullanici.lerta.com.tr",
    features: [
      "1 kurumsal adres",
      "Webmail + taslaklar",
      "Günlük gönderim kotası (pilot)",
    ],
    cta: "Pilot kayıt",
    highlighted: false,
  },
  {
    name: "Kurumsal",
    price: "Yakında",
    period: "özel domain",
    features: [
      "firma.com.tr MX + DNS sihirbazı",
      "IMAP (Outlook / Thunderbird)",
      "Çoklu kutu (yol haritası)",
    ],
    cta: "Domain ile başla",
    highlighted: true,
  },
  {
    name: "Operatör",
    price: "Özel",
    period: "yüksek hacim",
    features: [
      "Platform DNS doğrulama",
      "Öncelikli destek",
      "Faturalama entegrasyonu (planlı)",
    ],
    cta: "İletişim",
    highlighted: false,
  },
];

export default function MarketingHomePage() {
  const registerHref = `${consoleUrl.replace(/\/$/, "")}/register`;
  const loginHref = `${webmailUrl.replace(/\/$/, "")}/login`;
  const consoleLoginHref = `${consoleUrl.replace(/\/$/, "")}/login`;
  const domainHref = `${consoleUrl.replace(/\/$/, "")}/domain`;

  return (
    <div className="landing">
      <div className="wrap">
        <header>
          <div className="brand">Lerta Mail</div>
          <nav className="nav-links">
            <a className="btn btn-ghost" href="#fiyatlar">Fiyatlar</a>
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

        <section className="pricing" id="fiyatlar">
          <h2>Planlar</h2>
          <p className="pricing-lead">
            Kayıt <strong>yonetim.lerta.com.tr</strong> üzerinden; pilot için anında
            kutu, kurumsal için özel domain sihirbazı.
          </p>
          <div className="pricing-grid">
            {PLANS.map((plan) => (
              <article
                key={plan.name}
                className={`price-card ${plan.highlighted ? "highlight" : ""}`}
              >
                <h3>{plan.name}</h3>
                <p className="price">{plan.price}</p>
                <p className="price-period">{plan.period}</p>
                <ul>
                  {plan.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <a
                  className={`btn ${plan.highlighted ? "btn-primary" : "btn-ghost"}`}
                  href={
                    plan.name === "Kurumsal"
                      ? domainHref
                      : plan.name === "Operatör"
                        ? registerHref
                        : registerHref
                  }
                >
                  {plan.cta}
                </a>
              </article>
            ))}
          </div>
        </section>

        <footer>
          © {new Date().getFullYear()} Lerta Mail · Pilot: kullanici.lerta.com.tr ·
          Logistics ürünü ayrı domain: lerta.tr
        </footer>
      </div>
    </div>
  );
}
