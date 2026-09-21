"use client";

import { FormEvent, useEffect, useState } from "react";
import { AuthApiClient } from "../lib/AuthApiClient";
import { MarketplaceApiClient } from "../lib/MarketplaceApiClient";
import { IntegrationApiClient } from "../lib/IntegrationApiClient";
import { WebAccessTokenStorage } from "../lib/WebAccessTokenStorage";
import { PublicApiConfiguration } from "../lib/PublicApiConfiguration";

type ListingRecord = {
  listingId: string;
  origin: { cityName: string; countryCode: string };
  destination: { cityName: string; countryCode: string };
  weightTonnes: number;
  equipmentType: string;
  price: { amount: number; currencyCode: string } | null;
};

export default function HomePage() {
  const [locale, setLocale] = useState("tr");
  const [emailAddress, setEmailAddress] = useState("demo@nakliyeborsasi.local");
  const [password, setPassword] = useState("DemoPass123!");
  const [accessToken, setAccessToken] = useState("");
  const [listings, setListings] = useState<ListingRecord[]>([]);
  const [integrationPreview, setIntegrationPreview] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    setAccessToken(WebAccessTokenStorage.read());
  }, []);

  async function handleLogin(event: FormEvent): Promise<void> {
    event.preventDefault();
    setIsBusy(true);
    setErrorMessage("");
    try {
      const result = await AuthApiClient.login(emailAddress, password);
      WebAccessTokenStorage.save(result.accessToken);
      setAccessToken(result.accessToken);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Login error");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleLoadListings(): Promise<void> {
    setIsBusy(true);
    setErrorMessage("");
    try {
      const payload = (await MarketplaceApiClient.fetchListings(
        accessToken,
        locale,
      )) as { listings: ListingRecord[] };
      setListings(payload.listings ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Load error");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleLoadIntegrations(): Promise<void> {
    setIsBusy(true);
    setErrorMessage("");
    try {
      const payload = await IntegrationApiClient.fetchExternalOffers(
        accessToken,
        locale,
      );
      setIntegrationPreview(JSON.stringify(payload, null, 2));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Integration error");
    } finally {
      setIsBusy(false);
    }
  }

  function handleLogout(): void {
    WebAccessTokenStorage.clear();
    setAccessToken("");
    setListings([]);
    setIntegrationPreview("");
  }

  return (
    <div className="shell">
      <p className="pill">Web panel · API: {PublicApiConfiguration.resolveBaseUrl()}</p>
      <h1 className="title">Nakliye Borsası</h1>
      <p className="subtitle">
        TR + UA–EU yük borsası — giriş yapın, ilanları ve harici kaynak özetini görün.
      </p>

      {!accessToken ? (
        <section className="card">
          <h2>Giriş</h2>
          <form onSubmit={(event) => void handleLogin(event)}>
            <label>
              E-posta
              <input
                value={emailAddress}
                onChange={(event) => setEmailAddress(event.target.value)}
              />
            </label>
            <label>
              Şifre
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <label>
              Dil
              <select value={locale} onChange={(event) => setLocale(event.target.value)}>
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
                <option value="uk">Українська</option>
                <option value="ru">Русский</option>
              </select>
            </label>
            <button type="submit" disabled={isBusy}>
              {isBusy ? "..." : "Giriş yap"}
            </button>
          </form>
        </section>
      ) : (
        <>
          <section className="card">
            <div className="row">
              <button type="button" onClick={() => void handleLoadListings()} disabled={isBusy}>
                Platform ilanları
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => void handleLoadIntegrations()}
                disabled={isBusy}
              >
                Harici kaynaklar
              </button>
              <button type="button" className="secondary" onClick={handleLogout}>
                Çıkış
              </button>
            </div>
            {errorMessage ? <p className="error">{errorMessage}</p> : null}
          </section>

          {listings.length > 0 ? (
            <section className="card">
              <h2>Marketplace ilanları</h2>
              {listings.map((listing) => (
                <article key={listing.listingId} className="listing">
                  <h3>
                    {listing.origin.cityName} ({listing.origin.countryCode}) →{" "}
                    {listing.destination.cityName} ({listing.destination.countryCode})
                  </h3>
                  <p className="meta">
                    {listing.equipmentType} · {listing.weightTonnes} t
                    {listing.price
                      ? ` · ${listing.price.amount} ${listing.price.currencyCode}`
                      : ""}
                  </p>
                </article>
              ))}
            </section>
          ) : null}

          {integrationPreview ? (
            <section className="card">
              <h2>Harici entegrasyon yanıtı</h2>
              <pre>{integrationPreview}</pre>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
