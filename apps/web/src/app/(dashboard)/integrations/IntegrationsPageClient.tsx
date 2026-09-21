"use client";

import { useState } from "react";
import { EmptyState } from "../../../components/EmptyState";
import { ModulePageShell } from "../../../components/ModulePageShell";
import { useWebSession } from "../../../context/WebSessionProvider";
import { IntegrationApiClient } from "../../../lib/IntegrationApiClient";
import {
  formatProviderLabel,
  type NormalizedFreightOfferDto,
} from "../../../lib/IntegrationTypes";

const PROVIDER_CHIPS = ["LARDI_TRANS", "DELLA", "DAT", "TRUCKSTOP"] as const;

export function IntegrationsPageClient() {
  const { accessToken, locale } = useWebSession();
  const [originCountry, setOriginCountry] = useState("TR");
  const [destinationCountry, setDestinationCountry] = useState("UA");
  const [offers, setOffers] = useState<NormalizedFreightOfferDto[]>([]);
  const [failures, setFailures] = useState<{ providerCode: string; message: string }[]>(
    [],
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch(): Promise<void> {
    setIsBusy(true);
    setErrorMessage("");
    try {
      const payload = await IntegrationApiClient.fetchExternalOffers(
        accessToken,
        locale,
        {
          originCountryCode: originCountry || undefined,
          destinationCountryCode: destinationCountry || undefined,
          limit: 12,
        },
      );
      setOffers(payload.data?.offers ?? []);
      setFailures(payload.data?.failures ?? []);
      setHasSearched(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Entegrasyon hatası");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <ModulePageShell
      eyebrow="Entegrasyon"
      title="Harici borsa akışları"
      lead="Lardi, Della, DAT ve diğer kaynaklardan normalize edilmiş yük tekliflerini tek listede görün."
      action={
        <button
          type="button"
          className="btn-secondary btn-secondary--light"
          onClick={() => void handleSearch()}
          disabled={isBusy}
        >
          {isBusy ? "Taranıyor…" : "Kaynakları tara"}
        </button>
      }
      stats={[
        { value: String(offers.length), label: "Bulunan teklif" },
        { value: String(failures.length), label: "Kaynak uyarısı" },
        { value: String(PROVIDER_CHIPS.length), label: "Bağlı adapter", highlight: true },
      ]}
    >
      <section className="search-panel">
        <h2 className="search-panel-title">Entegrasyon araması</h2>
        <p className="search-panel-sub">Ülke kodu ile koridor filtreleyin (ör. TR → UA)</p>
        <div className="search-fields integration-fields">
          <label className="search-field">
            <span>Çıkış ülkesi</span>
            <input
              className="input-light"
              value={originCountry}
              onChange={(event) => setOriginCountry(event.target.value.toUpperCase())}
              maxLength={2}
            />
          </label>
          <label className="search-field">
            <span>Varış ülkesi</span>
            <input
              className="input-light"
              value={destinationCountry}
              onChange={(event) => setDestinationCountry(event.target.value.toUpperCase())}
              maxLength={2}
            />
          </label>
          <button type="button" className="btn-search" onClick={() => void handleSearch()} disabled={isBusy}>
            {isBusy ? "…" : "Ara"}
          </button>
        </div>
        <div className="provider-chips">
          {PROVIDER_CHIPS.map((code) => (
            <span key={code} className="provider-chip">
              {formatProviderLabel(code)}
            </span>
          ))}
        </div>
      </section>

      {errorMessage ? <p className="error banner error--light">{errorMessage}</p> : null}

      {failures.length > 0 ? (
        <ul className="integration-alerts">
          {failures.map((failure) => (
            <li key={`${failure.providerCode}-${failure.message}`}>
              <strong>{formatProviderLabel(failure.providerCode)}:</strong> {failure.message}
            </li>
          ))}
        </ul>
      ) : null}

      {!hasSearched ? (
        <EmptyState message="Harici teklifleri görmek için «Kaynakları tara» veya Ara kullanın." />
      ) : offers.length === 0 ? (
        <EmptyState message="Bu filtrede harici teklif bulunamadı." />
      ) : (
        <div className="freight-list">
          {offers.map((offer) => (
            <article key={offer.externalReferenceId} className="freight-row module-row">
              <div className="freight-row-main">
                <div className="freight-row-badges">
                  <span className="badge badge--provider">
                    {formatProviderLabel(offer.providerCode)}
                  </span>
                  <span className="badge badge--muted">{offer.equipmentType}</span>
                  <span className="badge badge--muted">{offer.dimensions.weightTonnes} t</span>
                </div>
                <h3 className="freight-route">
                  {offer.origin.cityName} ({offer.origin.countryCode}) —{" "}
                  {offer.destination.cityName} ({offer.destination.countryCode})
                </h3>
                <p className="module-row-meta">
                  Yükleme: {offer.loadingDateStart}
                  {offer.loadingDateEnd ? ` – ${offer.loadingDateEnd}` : ""} ·{" "}
                  {offer.marketScope}
                </p>
              </div>
              <div className="freight-row-price">
                {offer.price ? (
                  <>
                    <span className="price-amount">
                      {offer.price.amount.toLocaleString("tr-TR")}{" "}
                      {offer.price.currencyCode}
                    </span>
                    <span className="price-hint">Harici kaynak</span>
                  </>
                ) : (
                  <span className="price-hint">Fiyat yok</span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </ModulePageShell>
  );
}
