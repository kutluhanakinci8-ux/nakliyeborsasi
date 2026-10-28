"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  COMPANY_ADDRESS,
  COMPANY_EMAIL,
  COMPANY_PHONE_DISPLAY,
  COMPANY_PHONE_TEL,
  LEGAL_DISCLAIMER,
  SALES_EMAIL,
  SUPPORT_EMAIL,
} from "@/lib/marketingSite";

export type ContactTopic = "sales" | "technical" | "billing" | "general";

const TOPICS: { value: ContactTopic; label: string; hint: string; email: string }[] = [
  {
    value: "sales",
    label: "Satış & kurumsal teklif",
    hint: "Enterprise, köprü paketleri, pilot → kurumsal geçiş.",
    email: SALES_EMAIL,
  },
  {
    value: "technical",
    label: "Teknik destek",
    hint: "Posta, mesaj, DNS, erişim sorunları.",
    email: SUPPORT_EMAIL,
  },
  {
    value: "billing",
    label: "Fatura & plan",
    hint: "Ödeme, fatura, iptal, plan değişikliği.",
    email: SUPPORT_EMAIL,
  },
  {
    value: "general",
    label: "Genel",
    hint: "Diğer konular ve yönlendirme.",
    email: COMPANY_EMAIL,
  },
];

function topicFromParam(raw: string | null): ContactTopic {
  if (raw === "satis" || raw === "sales") return "sales";
  if (raw === "teknik" || raw === "technical") return "technical";
  if (raw === "fatura" || raw === "billing") return "billing";
  return "general";
}

export function ContactInquiryForm() {
  const searchParams = useSearchParams();
  const initialTopic = topicFromParam(searchParams.get("konu"));

  const [topic, setTopic] = useState<ContactTopic>(initialTopic);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [domain, setDomain] = useState("");
  const [message, setMessage] = useState("");

  const routing = useMemo(
    () => TOPICS.find((t) => t.value === topic) ?? TOPICS[0],
    [topic],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(`[Lerta — ${routing.label}] ${company || name || "İletişim"}`);
    const bodyLines = [
      `Konu: ${routing.label}`,
      `Ad: ${name}`,
      `E-posta: ${email}`,
      phone ? `Telefon: ${phone}` : "",
      company ? `Firma: ${company}` : "",
      domain ? `Alan adı: ${domain}` : "",
      "",
      message,
    ].filter(Boolean);
    const body = encodeURIComponent(bodyLines.join("\n"));
    window.location.href = `mailto:${routing.email}?subject=${subject}&body=${body}`;
  }

  return (
    <div className="contact-page">
      <form className="contact-form" onSubmit={handleSubmit}>
        <fieldset className="contact-form__topics">
          <legend className="destek-search__label">Konu seçin</legend>
          <div className="contact-form__topic-grid">
            {TOPICS.map((t) => (
              <label
                key={t.value}
                className={`contact-form__topic${topic === t.value ? " contact-form__topic--active" : ""}`}
              >
                <input
                  type="radio"
                  name="topic"
                  value={t.value}
                  checked={topic === t.value}
                  onChange={() => setTopic(t.value)}
                />
                <span className="contact-form__topic-title">{t.label}</span>
                <span className="contact-form__topic-hint">{t.hint}</span>
                <span className="contact-form__topic-email">{t.email}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="contact-form__fields">
          <label>
            Ad soyad
            <input required name="name" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            E-posta
            <input
              required
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Telefon (isteğe bağlı)
            <input name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label>
            Firma (isteğe bağlı)
            <input name="company" value={company} onChange={(e) => setCompany(e.target.value)} />
          </label>
          <label>
            Alan adı (posta sorunları için)
            <input
              name="domain"
              placeholder="ornek.com.tr"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </label>
          <label className="contact-form__message">
            Mesajınız
            <textarea
              required
              name="message"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
        </div>

        <p className="contact-form__routing">
          Gönder tuşu e-posta uygulamanızı açar; alıcı:{" "}
          <strong>{routing.email}</strong>. Canlı sohbet sunulmaz — önce{" "}
          <Link href="/destek">destek merkezi</Link> ve <Link href="/rehberler">rehberler</Link>.
        </p>

        <button type="submit" className="btn btn-primary posta-btn-primary">
          E-posta ile gönder
        </button>
      </form>

      <aside className="contact-aside" aria-labelledby="contact-direct-title">
        <h2 id="contact-direct-title" className="destek-section-title">
          Doğrudan kanallar
        </h2>
        <ul className="contact-aside__list">
          <li>
            <span className="destek-contact-label">Telefon (satış & teknik)</span>
            <a href={`tel:${COMPANY_PHONE_TEL}`}>{COMPANY_PHONE_DISPLAY}</a>
            <span className="contact-aside__hours">İş günleri 09:00–18:00 (TR)</span>
          </li>
          <li>
            <span className="destek-contact-label">Adres</span>
            {COMPANY_ADDRESS}
          </li>
          <li>
            <span className="destek-contact-label">Acil kesinti</span>
            <Link href="/durum">Canlı durum</Link> → sonra{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </li>
        </ul>
        <p className="legal-muted">{LEGAL_DISCLAIMER}</p>
      </aside>
    </div>
  );
}
