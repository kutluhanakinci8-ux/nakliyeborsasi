"use client";

import Link from "next/link";
import { useState } from "react";
import { PublicPageShell } from "../../components/PublicPageShell";
import { SiteLayout } from "../../components/SiteLayout";
import { SocialMediaLinks } from "../../components/SocialMediaLinks";

const SECTIONS = [
  { id: "linkler", label: "Metin linkler" },
  { id: "footer", label: "Footer menü" },
  { id: "kartlar", label: "Kartlar" },
  { id: "butonlar", label: "Butonlar" },
  { id: "sosyal", label: "Sosyal medya" },
  { id: "sss", label: "SSS" },
  { id: "satir", label: "Liste satırı" },
] as const;

export function UiShowcaseClient() {
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  return (
    <SiteLayout headerVariant="public">
      <PublicPageShell
        breadcrumbLabel="Tasarım önizleme"
        title="Hover ve premium efekt galerisi"
        lead="Aşağıdaki örneklerin üzerine gelin, tıklayın ve karşılaştırın. Beğendiğiniz stili söyleyin — canlı siteye taşıyalım."
        showHeroVisual={false}
        heroCompact
        subnav={SECTIONS.map((s) => ({ href: `#${s.id}`, label: s.label }))}
      >
        <p className="ui-showcase-note module-panel">
          Bu sayfa yalnızca deneme içindir. URL: <strong>/ui-ornekleri</strong>
        </p>

        <section id="linkler" className="ui-showcase-section module-panel module-panel--elevated">
          <h2 className="ui-showcase-heading">1. Metin link efektleri</h2>
          <p className="ui-showcase-lead">
            Aynı metin, farklı hover dili — hangisi size daha premium geliyor?
          </p>
          <div className="ui-demo-grid ui-demo-grid--4">
            <div className="ui-demo-cell">
              <span className="ui-demo-label">Alt çizgi büyümesi</span>
              <a href="#linkler" className="ui-demo-link ui-demo-link--underline">
                Yük arama
              </a>
            </div>
            <div className="ui-demo-cell">
              <span className="ui-demo-label">Ok + kayma (footer tarzı)</span>
              <a href="#linkler" className="ui-demo-link ui-demo-link--arrow">
                İhaleler
              </a>
            </div>
            <div className="ui-demo-cell">
              <span className="ui-demo-label">Mint glow</span>
              <a href="#linkler" className="ui-demo-link ui-demo-link--glow">
                Mesajlar
              </a>
            </div>
            <div className="ui-demo-cell">
              <span className="ui-demo-label">Pill genişleme</span>
              <a href="#linkler" className="ui-demo-link ui-demo-link--pill">
                Güven
              </a>
            </div>
          </div>
        </section>

        <section id="footer" className="ui-showcase-section module-panel module-panel--elevated">
          <h2 className="ui-showcase-heading">2. Footer menü (canlı site stili)</h2>
          <p className="ui-showcase-lead">Şu an footer’da kullanılan davranış — referans.</p>
          <ul className="site-footer-links ui-demo-footer-list">
            {["Yük arama", "İhaleler", "Mesajlar", "Güven"].map((label) => (
              <li key={label}>
                <Link href="/marketplace">{label}</Link>
              </li>
            ))}
          </ul>
          <p className="ui-showcase-lead">Yasal pill hover (canlı)</p>
          <nav className="site-footer-legal ui-demo-legal-row" aria-label="Örnek yasal">
            <Link href="/kisisel-verilerin-korunmasi">Kişisel Verilerin Korunması</Link>
            <Link href="/kullanim-kosullari">Kullanım Koşullarımız</Link>
            <Link href="/cerez-ayarlari">Çerez Ayarları</Link>
          </nav>
        </section>

        <section id="kartlar" className="ui-showcase-section module-panel module-panel--elevated">
          <h2 className="ui-showcase-heading">3. Kart hover</h2>
          <div className="ui-demo-grid ui-demo-grid--4">
            <div className="ui-demo-card ui-demo-card--glow">
              <strong>Kenar ışığı</strong>
              <p>Hover: mint halo + gölge</p>
            </div>
            <div className="ui-demo-card ui-demo-card--lift">
              <strong>Kalkma</strong>
              <p>translateY + derin gölge</p>
            </div>
            <div className="ui-demo-card ui-demo-card--gradient">
              <strong>Gradyan kayması</strong>
              <p>Arka plan animasyonu</p>
            </div>
            <div className="ui-demo-card ui-demo-card--bar">
              <strong>Üst şerit</strong>
              <p>Aktif / hover çizgi</p>
            </div>
          </div>
        </section>

        <section id="butonlar" className="ui-showcase-section module-panel module-panel--elevated">
          <h2 className="ui-showcase-heading">4. Buton efektleri</h2>
          <div className="ui-demo-button-row">
            <button type="button" className="ui-demo-btn ui-demo-btn--shine">
              Shine sweep
            </button>
            <button type="button" className="ui-demo-btn ui-demo-btn--gradient">
              Gradyan kaydırma
            </button>
            <button type="button" className="btn-gold-wide ui-demo-btn-live">
              Canlı: Mesajı gönder
            </button>
          </div>
        </section>

        <section id="sosyal" className="ui-showcase-section module-panel module-panel--elevated">
          <h2 className="ui-showcase-heading">5. Sosyal medya</h2>
          <p className="ui-showcase-lead">Canlı 3D ikonlar (footer ile aynı bileşen)</p>
          <SocialMediaLinks />
          <p className="ui-showcase-lead">Ek: ripple + tooltip denemesi</p>
          <div className="ui-demo-social-extra">
            <a
              href="https://t.me/nakliyeborsasi"
              className="ui-demo-social ui-demo-social--telegram"
              target="_blank"
              rel="noopener noreferrer"
              data-tooltip="Telegram"
            >
              TG
            </a>
            <a
              href="https://www.linkedin.com/"
              className="ui-demo-social ui-demo-social--linkedin"
              target="_blank"
              rel="noopener noreferrer"
              data-tooltip="LinkedIn"
            >
              in
            </a>
            <a
              href="https://www.instagram.com/"
              className="ui-demo-social ui-demo-social--instagram"
              target="_blank"
              rel="noopener noreferrer"
              data-tooltip="Instagram"
            >
              IG
            </a>
          </div>
        </section>

        <section id="sss" className="ui-showcase-section module-panel module-panel--elevated">
          <h2 className="ui-showcase-heading">6. SSS accordion (premium)</h2>
          <ul className="faq-list faq-list--premium ui-demo-faq">
            {[
              { q: "Demo hesabı nasıl alınır?", a: "Giriş sayfasındaki demo kullanıcıları veya iletişim formu." },
              { q: "Yanıt süresi ne kadar?", a: "Form taleplerine 24 saat hedefi (iş günü)." },
            ].map((item, index) => {
              const isOpen = faqOpen === index;
              return (
                <li key={item.q} className={isOpen ? "faq-item open ui-demo-faq-item" : "faq-item ui-demo-faq-item"}>
                  <button
                    type="button"
                    className="faq-question"
                    aria-expanded={isOpen}
                    onClick={() => setFaqOpen(isOpen ? null : index)}
                  >
                    {item.q}
                    <span className="faq-toggle ui-demo-faq-toggle" aria-hidden>
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                  {isOpen ? <p className="faq-answer">{item.a}</p> : null}
                </li>
              );
            })}
          </ul>
        </section>

        <section id="satir" className="ui-showcase-section module-panel module-panel--elevated">
          <h2 className="ui-showcase-heading">7. Marketplace satır hover</h2>
          <div className="ui-demo-freight-row">
            <div>
              <span className="ui-demo-freight-route">İstanbul → Varşova</span>
              <span className="ui-demo-freight-meta">24 t · tent · TR→PL</span>
            </div>
            <span className="ui-demo-freight-price">€ 1.240</span>
          </div>
        </section>
      </PublicPageShell>
    </SiteLayout>
  );
}
