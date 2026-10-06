"use client";

import { useEffect, useState } from "react";
import {
  MessagingIntegrationApiClient,
  type MessagingAutomationCatalog,
} from "../../lib/MessagingIntegrationApiClient";
import { PublicApiConfiguration } from "../../lib/PublicApiConfiguration";

type Props = {
  accessToken: string;
  isCompanyOwner: boolean;
};

export function MessagingAutomationCatalogPanel({
  accessToken,
  isCompanyOwner,
}: Props) {
  const [catalog, setCatalog] = useState<MessagingAutomationCatalog | null>(
    null,
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    void MessagingIntegrationApiClient.fetchAutomationCatalog(accessToken)
      .then((payload) => setCatalog(payload.catalog))
      .catch(() => setError("Zapier / Make kataloğu yüklenemedi"));
  }, [accessToken]);

  if (!isCompanyOwner) {
    return (
      <p className="module-hint">
        Zapier ve partner API yalnızca firma sahibi tarafından yapılandırılır.
      </p>
    );
  }

  const publicBase = `${PublicApiConfiguration.resolveBaseUrl()}/api/v1/public/lerta-messaging/v1`;

  return (
    <section
      className="messaging-automation-catalog"
      aria-label="Zapier ve otomasyon kataloğu"
    >
      <h3 className="messaging-automation-catalog-title">
        Zapier · Make · özel webhook
      </h3>
      {error ? <p className="error banner error--light">{error}</p> : null}
      {catalog ? (
        <>
          <p className="module-hint">
            Katalog sürümü: <code>{catalog.version}</code> · Public API:{" "}
            <code>{publicBase}</code>
          </p>
          <h4 className="messaging-automation-catalog-sub">Tetikleyiciler</h4>
          <ul className="messaging-automation-catalog-list">
            {catalog.triggers.map((row) => (
              <li key={row.event}>
                <strong>{row.event}</strong> — {row.descriptionTr}
                <span className="messaging-automation-catalog-meta">
                  {row.subscribeVia}
                </span>
              </li>
            ))}
          </ul>
          <p className="module-hint messaging-automation-catalog-note">
            {catalog.zapier.noteTr}
          </p>
          <p className="module-hint messaging-automation-catalog-note">
            {catalog.make.noteTr}
          </p>
        </>
      ) : (
        <p className="module-hint">Katalog yükleniyor…</p>
      )}
    </section>
  );
}
