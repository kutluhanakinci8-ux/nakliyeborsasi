"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ContactOfficeMap } from "../../components/ContactOfficeMap";
import { ModulePageShell } from "../../components/ModulePageShell";
import { SocialMediaLinks } from "../../components/SocialMediaLinks";
import {
  CONTACT_FAQ,
  CONTACT_ROUTES,
  type ContactTopic,
} from "../../lib/contactOffices";

export function ContactPageClient() {
  const [topic, setTopic] = useState<ContactTopic>("demo");
  const [sent, setSent] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSent(true);
  }

  const selectedRoute = CONTACT_ROUTES.find((route) => route.topic === topic);

  return (
    <ModulePageShell
      eyebrow="İletişim"
      title="Bize ulaşın"
      lead="Satış, destek, basın veya ortaklık — doğru ekibe yönlendirilirsiniz. Form, ofis haritası ve SSS tek sayfada."
      stats={[
        { value: "24 saat", label: "Form yanıt hedefi (iş günü)" },
        { value: "3 ofis", label: "TR · UA · EU" },
        { value: "4 dil", label: "Destek dili", highlight: true },
      ]}
    >
      <div className="contact-route-grid">
        {CONTACT_ROUTES.map((route) => (
          <button
            key={route.topic}
            type="button"
            className={
              topic === route.topic ? "contact-route-card active" : "contact-route-card"
            }
            onClick={() => setTopic(route.topic)}
          >
            <span className="contact-route-title">{route.title}</span>
            <span className="contact-route-desc">{route.description}</span>
            <span className="contact-route-email">{route.email}</span>
          </button>
        ))}
      </div>

      {sent ? (
        <p className="success banner">Teşekkürler. Mesajınız kaydedildi — en kısa sürede dönüş yapılacak.</p>
      ) : null}

      <div className="contact-layout contact-layout--wide">
        <section className="module-panel">
          <h2 className="module-panel-title">Mesaj gönderin</h2>
          {selectedRoute ? (
            <p className="contact-form-hint">
              Seçili kanal: <strong>{selectedRoute.title}</strong> · {selectedRoute.email}
            </p>
          ) : null}
          <form onSubmit={handleSubmit}>
            <div className="contact-form-row">
              <label className="label-light">
                Ad soyad
                <input className="input-light" required name="name" autoComplete="name" />
              </label>
              <label className="label-light">
                E-posta
                <input
                  className="input-light"
                  type="email"
                  required
                  name="email"
                  autoComplete="email"
                />
              </label>
            </div>
            <label className="label-light">
              Telefon (isteğe bağlı)
              <input className="input-light" type="tel" name="phone" autoComplete="tel" />
            </label>
            <label className="label-light">
              Konu
              <select
                className="input-light"
                name="topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value as ContactTopic)}
              >
                <option value="demo">Demo talebi</option>
                <option value="support">Destek</option>
                <option value="press">Basın</option>
                <option value="career">Kariyer</option>
                <option value="partner">İş ortaklığı</option>
              </select>
            </label>
            <label className="label-light">
              Mesaj
              <textarea
                className="input-light trust-textarea"
                required
                name="message"
                rows={5}
                placeholder="Koridor, hacim veya entegrasyon ihtiyacınızı kısaca yazın…"
              />
            </label>
            <button type="submit" className="btn-accent">
              Gönder
            </button>
          </form>
        </section>

        <aside className="contact-side-stack">
          <section className="module-panel contact-channel-panel">
            <h2 className="module-panel-title">Hızlı kanallar</h2>
            <ul className="contact-channel-list">
              <li>
                <a href="tel:+902120000000">+90 (212) 000 00 00</a>
                <span>TR genel hat</span>
              </li>
              <li>
                <a href="mailto:info@nakliyeborsasi.local">info@nakliyeborsasi.local</a>
                <span>Genel bilgi</span>
              </li>
              <li>
                <Link href="/login">Platform girişi →</Link>
                <span>Demo hesaplar</span>
              </li>
            </ul>
            <p className="contact-social-label">Sosyal medya</p>
            <SocialMediaLinks />
          </section>
          <section className="module-panel contact-sla-panel">
            <h2 className="module-panel-title">Yanıt beklentisi</h2>
            <ul className="contact-sla-list">
              <li>
                <strong>E-posta / form</strong> — 24 saat (iş günü)
              </li>
              <li>
                <strong>Telefon</strong> — mesai saatleri içinde
              </li>
              <li>
                <strong>Acil operasyon</strong> — mevcut müşteri destek hattı
              </li>
            </ul>
          </section>
        </aside>
      </div>

      <ContactOfficeMap />

      <section className="module-panel contact-faq">
        <h2 className="module-panel-title">Sık sorulan sorular</h2>
        <ul className="faq-list">
          {CONTACT_FAQ.map((item, index) => {
            const isOpen = openFaq === index;
            return (
              <li key={item.question} className={isOpen ? "faq-item open" : "faq-item"}>
                <button
                  type="button"
                  className="faq-question"
                  aria-expanded={isOpen}
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                >
                  {item.question}
                  <span aria-hidden>{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen ? <p className="faq-answer">{item.answer}</p> : null}
              </li>
            );
          })}
        </ul>
      </section>
    </ModulePageShell>
  );
}
