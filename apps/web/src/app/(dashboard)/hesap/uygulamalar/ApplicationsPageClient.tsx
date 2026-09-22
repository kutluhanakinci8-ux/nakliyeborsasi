"use client";

import { useWebSession } from "../../../../context/WebSessionProvider";

const MODULES = [
  { code: "marketplace", label: "Yük arama / marketplace", status: "active" as const },
  { code: "auctions", label: "İhaleler", status: "active" as const },
  { code: "messaging", label: "Mesajlar", status: "active" as const },
  { code: "trust", label: "Güven profili", status: "active" as const },
  { code: "integrations", label: "Entegrasyon API", status: "active" as const },
  { code: "analytics", label: "Koridor analitiği", status: "pending" as const },
];

export function ApplicationsPageClient() {
  const { session } = useWebSession();

  return (
    <>
      <div className="stats-strip">
        <div className="stat-item stat-item--highlight">
          <span className="stat-item-value">
            {String(MODULES.filter((m) => m.status === "active").length)}
          </span>
          <span className="stat-item-label">Aktif modül</span>
        </div>
        <div className="stat-item">
          <span className="stat-item-value">carrier_professional_tr_ua</span>
          <span className="stat-item-label">Abonelik paketi</span>
        </div>
      </div>

      <section className="account-card module-panel module-panel--elevated">
        <header className="account-card-head">
          <div>
            <h2 className="account-card-title">Bağlı uygulamalar</h2>
            <p className="account-card-lead">
              Firmanızın aboneliğiyle açılan modüller. API anahtarları entegrasyon
              sayfasından yönetilir.
            </p>
          </div>
        </header>
        <ul className="account-partner-list">
          {MODULES.map((module) => (
            <li key={module.code} className="account-partner-item">
              <div className="account-partner-main">
                <div className="account-partner-title-row">
                  <h3 className="account-partner-name">{module.label}</h3>
                  <span
                    className={
                      module.status === "active"
                        ? "account-status-pill account-status-pill--ok"
                        : "account-status-pill account-status-pill--pending"
                    }
                  >
                    {module.status === "active" ? "Aktif" : "Paket dışı"}
                  </span>
                </div>
                <p className="account-meta-line">
                  Kod: <code>{module.code}</code>
                </p>
              </div>
            </li>
          ))}
        </ul>
        <p className="account-meta-line">
          Firma: <code>{session?.companyId?.slice(0, 8) ?? "—"}</code>
        </p>
      </section>
    </>
  );
}
