"use client";

import { FormEvent, useState } from "react";

export function IletisimFormClient() {
  const [sent, setSent] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSent(true);
  }

  return (
    <>
      {sent ? (
        <p className="success banner">Teşekkürler. Mesajınız alındı (demo).</p>
      ) : null}
      <div className="contact-layout">
        <section className="module-panel">
          <h2 className="module-panel-title">İletişim formu</h2>
          <form onSubmit={handleSubmit}>
            <label className="label-light">
              Ad soyad
              <input className="input-light" required name="name" />
            </label>
            <label className="label-light">
              E-posta
              <input className="input-light" type="email" required name="email" />
            </label>
            <label className="label-light">
              Konu
              <select className="input-light" name="topic" defaultValue="demo">
                <option value="demo">Demo talebi</option>
                <option value="press">Basın</option>
                <option value="career">Kariyer</option>
                <option value="partner">İş ortaklığı</option>
              </select>
            </label>
            <label className="label-light">
              Mesaj
              <textarea className="input-light trust-textarea" required name="message" rows={5} />
            </label>
            <button type="submit" className="btn-accent">
              Gönder
            </button>
          </form>
        </section>
        <aside className="module-panel contact-aside">
          <h2 className="module-panel-title">Ofis bilgileri (demo)</h2>
          <ul className="contact-info-list">
            <li>
              <strong>E-posta</strong>
              <br />
              info@nakliyeborsasi.local
            </li>
            <li>
              <strong>Telefon</strong>
              <br />
              +90 (212) 000 00 00
            </li>
            <li>
              <strong>Adres</strong>
              <br />
              İstanbul · Kyiv · AB koridoru
            </li>
          </ul>
        </aside>
      </div>
    </>
  );
}
