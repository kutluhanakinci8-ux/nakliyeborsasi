"use client";

import { useState } from "react";
import { CONTACT_OFFICES, type ContactOffice } from "../lib/contactOffices";

export function ContactOfficeMap() {
  const [activeId, setActiveId] = useState(CONTACT_OFFICES[0]?.id ?? "istanbul");
  const office = CONTACT_OFFICES.find((item) => item.id === activeId) ?? CONTACT_OFFICES[0];

  if (!office) {
    return null;
  }

  return (
    <section className="contact-map-section module-panel">
      <div className="contact-map-head">
        <h2 className="module-panel-title">Ofisler ve harita</h2>
        <p className="muted muted--dark">
          TR · UA · EU koridorunda üç temas noktası — yol tarifi için haritayı açın.
        </p>
      </div>
      <div className="office-tabs" role="tablist">
        {CONTACT_OFFICES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === activeId}
            className={item.id === activeId ? "office-tab active" : "office-tab"}
            onClick={() => setActiveId(item.id)}
          >
            {item.city} ({item.country})
          </button>
        ))}
      </div>
      <OfficeDetail office={office} />
    </section>
  );
}

function OfficeDetail({ office }: { office: ContactOffice }) {
  return (
    <div className="office-detail">
      <div className="office-detail-info">
        <p className="office-label">{office.label}</p>
        <p className="office-address">{office.addressLine}</p>
        <ul className="office-meta-list">
          <li>
            <span className="office-meta-key">Telefon</span>
            <a href={`tel:${office.phone.replace(/\s/g, "")}`}>{office.phone}</a>
          </li>
          <li>
            <span className="office-meta-key">E-posta</span>
            <a href={`mailto:${office.email}`}>{office.email}</a>
          </li>
          <li>
            <span className="office-meta-key">Çalışma</span>
            <span>
              {office.hours} · {office.timezone}
            </span>
          </li>
        </ul>
        <a
          href={office.directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="corporate-card-link"
        >
          Yol tarifi (OpenStreetMap) →
        </a>
      </div>
      <div className="office-map-wrap">
        <iframe
          title={`Harita — ${office.city}`}
          className="office-map-iframe"
          src={office.mapEmbedUrl}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
}
