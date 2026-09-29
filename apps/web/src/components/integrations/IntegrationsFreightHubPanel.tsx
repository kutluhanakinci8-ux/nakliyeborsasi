"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "../EmptyState";
import {
  FreightRouteCountryBadges,
  FreightRouteHeading,
} from "../FreightRouteHeading";
import { IntegrationApiClient } from "../../lib/IntegrationApiClient";
import {
  formatProviderLabel,
  type NormalizedFreightOfferDto,
} from "../../lib/IntegrationTypes";
import { resolveFreightLocationPoint } from "../../lib/freightLocationDisplay";
import {
  FREIGHT_PROVIDER_CODES,
  INTEGRATION_CORRIDOR_PRESETS,
  freightProviderMeta,
  type FreightProviderCode,
} from "../../lib/integrationsHubConfig";

type ProviderHealth = "idle" | "ok" | "warn" | "error";

type Props = {
  accessToken: string;
  locale: string;
};

export function IntegrationsFreightHubPanel({ accessToken, locale }: Props) {
  const [originCountry, setOriginCountry] = useState("TR");
  const [destinationCountry, setDestinationCountry] = useState("UA");
  const [enabledProviders, setEnabledProviders] = useState<Set<FreightProviderCode>>(
    () => new Set(FREIGHT_PROVIDER_CODES),
  );
  const [offers, setOffers] = useState<NormalizedFreightOfferDto[]>([]);
  const [failures, setFailures] = useState<{ providerCode: string; message: string }[]>(
    [],
  );
  const [providerHealth, setProviderHealth] = useState<
    Record<string, ProviderHealth>
  >({});
  const [sortBy, setSortBy] = useState<"price" | "date">("date");
  const [errorMessage, setErrorMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const sortedOffers = useMemo(() => {
    const list = [...offers];
    if (sortBy === "price") {
      list.sort((a, b) => {
        const pa = a.price?.amount ?? Number.POSITIVE_INFINITY;
        const pb = b.price?.amount ?? Number.POSITIVE_INFINITY;
        return pa - pb;
      });
    } else {
      list.sort((a, b) =>
        a.loadingDateStart.localeCompare(b.loadingDateStart),
      );
    }
    return list;
  }, [offers, sortBy]);

  function toggleProvider(code: FreightProviderCode): void {
    setEnabledProviders((current) => {
      const next = new Set(current);
      if (next.has(code)) {
        if (next.size <= 1) {
          return current;
        }
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }

  async function handleSearch(): Promise<void> {
    setIsBusy(true);
    setErrorMessage("");
    const providers = [...enabledProviders];
    try {
      const payload = await IntegrationApiClient.fetchExternalOffers(
        accessToken,
        locale,
        {
          originCountryCode: originCountry || undefined,
          destinationCountryCode: destinationCountry || undefined,
          limit: 24,
          providers,
        },
      );
      const nextOffers = payload.data?.offers ?? [];
      const nextFailures = payload.data?.failures ?? [];
      setOffers(nextOffers);
      setFailures(nextFailures);
      setHasSearched(true);

      const health: Record<string, ProviderHealth> = {};
      for (const code of providers) {
        health[code] = "warn";
      }
      for (const failure of nextFailures) {
        health[failure.providerCode] = "error";
      }
      const okProviders = new Set(nextOffers.map((o) => o.providerCode));
      for (const code of okProviders) {
        health[code] = "ok";
      }
      for (const code of providers) {
        if (!health[code]) {
          health[code] = "warn";
        }
      }
      setProviderHealth(health);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Entegrasyon hatası");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="integrations-premium-panel">
      <div className="integrations-panel-head">
        <h2 className="integrations-panel-title">Harici yük borsaları</h2>
        <p className="integrations-panel-sub">
          Lardi, Della, DAT ve Truckstop — normalize teklifler tek listede. Koridor ve
          kaynak seçerek tarayın.
        </p>
      </div>

      <div className="integrations-corridor-presets" role="group" aria-label="Koridor">
        {INTEGRATION_CORRIDOR_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={
              originCountry === preset.origin && destinationCountry === preset.destination
                ? "integrations-corridor-chip integrations-corridor-chip--on"
                : "integrations-corridor-chip"
            }
            onClick={() => {
              setOriginCountry(preset.origin);
              setDestinationCountry(preset.destination);
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="integrations-provider-grid">
        {FREIGHT_PROVIDER_CODES.map((code) => {
          const meta = freightProviderMeta(code);
          const health = providerHealth[code] ?? "idle";
          const on = enabledProviders.has(code);
          return (
            <button
              key={code}
              type="button"
              className={[
                "integrations-provider-card",
                on ? "integrations-provider-card--on" : "",
                health === "ok" ? "integrations-provider-card--ok" : "",
                health === "error" ? "integrations-provider-card--error" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={on}
              onClick={() => toggleProvider(code)}
            >
              <span className="integrations-provider-card-top">
                <span className="integrations-provider-card-name">{meta.label}</span>
                <span className={`integrations-provider-health integrations-provider-health--${health}`}>
                  {health === "idle"
                    ? "—"
                    : health === "ok"
                      ? "OK"
                      : health === "error"
                        ? "Uyarı"
                        : "Boş"}
                </span>
              </span>
              <span className="integrations-provider-card-blurb">{meta.blurb}</span>
            </button>
          );
        })}
      </div>

      <div className="integrations-search-row">
        <label className="integrations-field">
          <span>Çıkış</span>
          <input
            className="integrations-field-input"
            value={originCountry}
            onChange={(event) => setOriginCountry(event.target.value.toUpperCase())}
            maxLength={2}
            aria-label="Çıkış ülke kodu"
          />
        </label>
        <label className="integrations-field">
          <span>Varış</span>
          <input
            className="integrations-field-input"
            value={destinationCountry}
            onChange={(event) =>
              setDestinationCountry(event.target.value.toUpperCase())
            }
            maxLength={2}
            aria-label="Varış ülke kodu"
          />
        </label>
        <label className="integrations-field integrations-field--sort">
          <span>Sırala</span>
          <select
            className="integrations-field-input"
            value={sortBy}
            onChange={(event) =>
              setSortBy(event.target.value as "price" | "date")
            }
          >
            <option value="date">Yükleme tarihi</option>
            <option value="price">Fiyat (artan)</option>
          </select>
        </label>
        <button
          type="button"
          className="btn-accent integrations-search-btn"
          disabled={isBusy}
          onClick={() => void handleSearch()}
        >
          {isBusy ? "Taranıyor…" : "Kaynakları tara"}
        </button>
      </div>

      {errorMessage ? <p className="error banner error--light">{errorMessage}</p> : null}

      {failures.length > 0 ? (
        <ul className="integrations-alert-list">
          {failures.map((failure) => (
            <li key={`${failure.providerCode}-${failure.message}`}>
              <strong>{formatProviderLabel(failure.providerCode)}:</strong>{" "}
              {failure.message}
            </li>
          ))}
        </ul>
      ) : null}

      {!hasSearched ? (
        <EmptyState message="Koridor seçin ve «Kaynakları tara» ile harici teklifleri getirin." />
      ) : sortedOffers.length === 0 ? (
        <EmptyState message="Bu filtrede harici teklif bulunamadı." />
      ) : (
        <div className="integrations-offer-list">
          {sortedOffers.map((offer) => {
            const origin = resolveFreightLocationPoint(
              {
                cityName: offer.origin.cityName,
                countryCode: offer.origin.countryCode,
              },
              "origin",
            );
            const destination = resolveFreightLocationPoint(
              {
                cityName: offer.destination.cityName,
                countryCode: offer.destination.countryCode,
              },
              "destination",
            );
            return (
              <article key={offer.externalReferenceId} className="integrations-offer-card">
                <div className="integrations-offer-main">
                  <div className="integrations-offer-badges">
                    <FreightRouteCountryBadges
                      originCountry={origin.countryCode}
                      destinationCountry={destination.countryCode}
                    />
                    <span className="integrations-offer-provider">
                      {formatProviderLabel(offer.providerCode)}
                    </span>
                    <span className="integrations-offer-meta">{offer.equipmentType}</span>
                    <span className="integrations-offer-meta">
                      {offer.dimensions.weightTonnes} t
                    </span>
                  </div>
                  <FreightRouteHeading origin={origin} destination={destination} />
                  <p className="integrations-offer-dates">
                    Yükleme: {offer.loadingDateStart}
                    {offer.loadingDateEnd ? ` – ${offer.loadingDateEnd}` : ""} ·{" "}
                    {offer.marketScope}
                  </p>
                </div>
                <div className="integrations-offer-side">
                  {offer.price ? (
                    <>
                      <span className="integrations-offer-price">
                        {offer.price.amount.toLocaleString("tr-TR")}{" "}
                        {offer.price.currencyCode}
                      </span>
                      <span className="integrations-offer-price-hint">Harici kaynak</span>
                    </>
                  ) : (
                    <span className="integrations-offer-price-hint">Fiyat yok</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
