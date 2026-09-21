"use client";

import { FormEvent, useEffect, useState } from "react";
import { AuthApiClient } from "../lib/AuthApiClient";
import { MarketplaceApiClient } from "../lib/MarketplaceApiClient";
import { IntegrationApiClient } from "../lib/IntegrationApiClient";
import {
  AuctionApiClient,
  AuctionSessionRecord,
} from "../lib/AuctionApiClient";
import {
  MessagingApiClient,
  MessagingThreadRecord,
  ThreadMessageRecord,
} from "../lib/MessagingApiClient";
import { TrustScoreApiClient, TrustScoreRecord } from "../lib/TrustScoreApiClient";
import { WebAccessTokenStorage } from "../lib/WebAccessTokenStorage";
import { PublicApiConfiguration } from "../lib/PublicApiConfiguration";
import { SessionApiClient, AuthSessionRecord } from "../lib/SessionApiClient";

type ListingRecord = {
  listingId: string;
  ownerCompanyId: string;
  origin: { cityName: string; countryCode: string };
  destination: { cityName: string; countryCode: string };
  weightTonnes: number;
  equipmentType: string;
  price: { amount: number; currencyCode: string } | null;
};

export function HomePageClient() {
  const [locale, setLocale] = useState("tr");
  const [emailAddress, setEmailAddress] = useState("demo@nakliyeborsasi.local");
  const [password, setPassword] = useState("DemoPass123!");
  const [accessToken, setAccessToken] = useState("");
  const [session, setSession] = useState<AuthSessionRecord | null>(null);
  const [listings, setListings] = useState<ListingRecord[]>([]);
  const [openAuctions, setOpenAuctions] = useState<AuctionSessionRecord[]>([]);
  const [closedAuctions, setClosedAuctions] = useState<AuctionSessionRecord[]>([]);
  const [threads, setThreads] = useState<MessagingThreadRecord[]>([]);
  const [activeThreadId, setActiveThreadId] = useState("");
  const [counterpartyId, setCounterpartyId] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [messages, setMessages] = useState<ThreadMessageRecord[]>([]);
  const [trustCompanyId, setTrustCompanyId] = useState("");
  const [trustScore, setTrustScore] = useState(5);
  const [trustComment, setTrustComment] = useState("Güvenilir taşıma partneri");
  const [trustSnapshot, setTrustSnapshot] = useState<TrustScoreRecord | null>(
    null,
  );
  const [integrationPreview, setIntegrationPreview] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    const token = WebAccessTokenStorage.read();
    setAccessToken(token);
    if (token) {
      void SessionApiClient.fetchSession(token)
        .then(setSession)
        .catch(() => {
          WebAccessTokenStorage.clear();
          setAccessToken("");
        });
    }
  }, []);

  async function handleLogin(event: FormEvent): Promise<void> {
    event.preventDefault();
    setIsBusy(true);
    setErrorMessage("");
    try {
      const result = await AuthApiClient.login(emailAddress, password);
      WebAccessTokenStorage.save(result.accessToken);
      setAccessToken(result.accessToken);
      const nextSession = await SessionApiClient.fetchSession(result.accessToken);
      setSession(nextSession);
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

  async function handleCreateAuction(listing: ListingRecord): Promise<void> {
    const minimumBidAmount = Number(
      window.prompt("Minimum teklif (EUR)", String(listing.price?.amount ?? 2000)),
    );
    if (!minimumBidAmount) {
      return;
    }
    setIsBusy(true);
    setErrorMessage("");
    try {
      await AuctionApiClient.createSession(accessToken, locale, {
        freightListingId: listing.listingId,
        minimumBidAmount,
        currencyCode: listing.price?.currencyCode ?? "EUR",
        durationHours: 24,
      });
      await handleLoadAuctions();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Auction error");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleLoadAuctions(): Promise<void> {
    setIsBusy(true);
    setErrorMessage("");
    try {
      const openPayload = await AuctionApiClient.listSessions(
        accessToken,
        locale,
        "open",
      );
      const closedPayload = await AuctionApiClient.listSessions(
        accessToken,
        locale,
        "closed",
      );
      setOpenAuctions(openPayload.sessions ?? []);
      setClosedAuctions(closedPayload.sessions ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Auction error");
    } finally {
      setIsBusy(false);
    }
  }

  async function handlePlaceBid(sessionRecord: AuctionSessionRecord): Promise<void> {
    const bidAmount = Number(
      window.prompt("Teklif tutarı", sessionRecord.minimumBidAmount),
    );
    if (!bidAmount) {
      return;
    }
    setIsBusy(true);
    setErrorMessage("");
    try {
      await AuctionApiClient.placeBid(
        accessToken,
        locale,
        sessionRecord.id,
        bidAmount,
      );
      await handleLoadAuctions();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Bid error");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleLoadThreads(): Promise<void> {
    setIsBusy(true);
    setErrorMessage("");
    try {
      const payload = await MessagingApiClient.listThreads(accessToken, locale);
      setThreads(payload.threads ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Messaging error");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleOpenThread(): Promise<void> {
    if (!counterpartyId.trim()) {
      setErrorMessage("Karşı firma ID girin");
      return;
    }
    setIsBusy(true);
    setErrorMessage("");
    try {
      const payload = await MessagingApiClient.openThread(
        accessToken,
        locale,
        counterpartyId.trim(),
      );
      setActiveThreadId(payload.thread.id);
      await handleLoadThreads();
      await handleLoadMessages(payload.thread.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Messaging error");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleLoadMessages(threadId: string): Promise<void> {
    setActiveThreadId(threadId);
    setIsBusy(true);
    setErrorMessage("");
    try {
      const payload = await MessagingApiClient.listMessages(
        accessToken,
        locale,
        threadId,
      );
      setMessages(payload.messages ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Messaging error");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSendMessage(): Promise<void> {
    if (!activeThreadId || !messageBody.trim()) {
      return;
    }
    setIsBusy(true);
    setErrorMessage("");
    try {
      await MessagingApiClient.sendMessage(
        accessToken,
        locale,
        activeThreadId,
        messageBody.trim(),
      );
      setMessageBody("");
      await handleLoadMessages(activeThreadId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Messaging error");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleLoadTrust(): Promise<void> {
    if (!trustCompanyId.trim()) {
      setErrorMessage("Firma ID girin");
      return;
    }
    setIsBusy(true);
    setErrorMessage("");
    try {
      const payload = await TrustScoreApiClient.fetchSnapshot(trustCompanyId.trim());
      setTrustSnapshot(payload.snapshot);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Trust error");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSubmitTrust(): Promise<void> {
    if (!trustCompanyId.trim()) {
      setErrorMessage("Firma ID girin");
      return;
    }
    setIsBusy(true);
    setErrorMessage("");
    try {
      await TrustScoreApiClient.submitReview(
        accessToken,
        locale,
        trustCompanyId.trim(),
        trustScore,
        trustComment.trim(),
      );
      await handleLoadTrust();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Trust error");
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
    setSession(null);
    setListings([]);
    setOpenAuctions([]);
    setClosedAuctions([]);
    setThreads([]);
    setMessages([]);
    setTrustSnapshot(null);
    setIntegrationPreview("");
  }

  async function handleCopyCompanyId(): Promise<void> {
    if (!session?.companyId) {
      return;
    }
    await navigator.clipboard.writeText(session.companyId);
  }

  function fillCounterpartyFromListing(ownerCompanyId: string): void {
    setCounterpartyId(ownerCompanyId);
    setTrustCompanyId(ownerCompanyId);
  }

  function formatAuctionWinner(sessionRecord: AuctionSessionRecord): string {
    if (!sessionRecord.winningBidId || !sessionRecord.bids) {
      return sessionRecord.statusCode === "CLOSED" ? "Kazanan yok" : "";
    }
    const winningBid = sessionRecord.bids.find(
      (bid) => bid.id === sessionRecord.winningBidId,
    );
    if (!winningBid) {
      return "";
    }
    return `Kazanan: ${winningBid.bidAmount} · ${winningBid.bidderCompanyId.slice(0, 8)}…`;
  }

  return (
    <div className="shell">
      <p className="pill">Web · API: {PublicApiConfiguration.resolveBaseUrl()}</p>
      <h1 className="title">Nakliye Borsası</h1>
      <p className="subtitle">
        Demo: demo@ / partner@nakliyeborsasi.local · TR + UA–EU marketplace
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
                <option value="uk">Україnська</option>
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
            {session ? (
              <p className="meta session-info">
                Firma: {session.companyId} · {session.emailAddress}{" "}
                <button type="button" className="secondary" onClick={() => void handleCopyCompanyId()}>
                  ID kopyala
                </button>
              </p>
            ) : null}
            <div className="row">
              <button type="button" onClick={() => void handleLoadListings()} disabled={isBusy}>
                Platform ilanları
              </button>
              <button type="button" className="secondary" onClick={() => void handleLoadAuctions()} disabled={isBusy}>
                Açık artırmalar
              </button>
              <button type="button" className="secondary" onClick={() => void handleLoadThreads()} disabled={isBusy}>
                Mesajlar
              </button>
              <button type="button" className="secondary" onClick={() => void handleLoadIntegrations()} disabled={isBusy}>
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
                    {listing.origin.cityName} → {listing.destination.cityName}
                  </h3>
                  <p className="meta">
                    {listing.equipmentType} · {listing.weightTonnes} t
                    {listing.price
                      ? ` · ${listing.price.amount} ${listing.price.currencyCode}`
                      : ""}
                  </p>
                  {listing.ownerCompanyId ? (
                    <>
                      <p className="meta listing-id">Firma: {listing.ownerCompanyId}</p>
                      <div className="row">
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => fillCounterpartyFromListing(listing.ownerCompanyId)}
                        >
                          Firma ID (mesaj/güven)
                        </button>
                        <button type="button" onClick={() => void handleCreateAuction(listing)}>
                          Açık artırma aç
                        </button>
                      </div>
                    </>
                  ) : null}
                </article>
              ))}
            </section>
          ) : null}

          {openAuctions.length > 0 || closedAuctions.length > 0 ? (
            <section className="card">
              <h2>Açık artırmalar</h2>
              {openAuctions.map((sessionRecord) => (
                <article key={sessionRecord.id} className="listing">
                  <p className="meta">
                    Min {sessionRecord.minimumBidAmount} {sessionRecord.currencyCode} · Bitiş{" "}
                    {sessionRecord.endsAt}
                  </p>
                  <button type="button" onClick={() => void handlePlaceBid(sessionRecord)}>
                    Teklif ver
                  </button>
                </article>
              ))}
              <h2>Kapanmış artırmalar</h2>
              {closedAuctions.map((sessionRecord) => (
                <article key={sessionRecord.id} className="listing">
                  <p className="meta">{formatAuctionWinner(sessionRecord)}</p>
                </article>
              ))}
            </section>
          ) : null}

          <section className="card">
            <h2>Mesajlaşma</h2>
            <label>
              Karşı firma ID
              <input
                value={counterpartyId}
                onChange={(event) => setCounterpartyId(event.target.value)}
              />
            </label>
            <button type="button" onClick={() => void handleOpenThread()} disabled={isBusy}>
              Sohbet aç
            </button>
            {threads.map((thread) => (
              <div key={thread.threadId} className="thread-row">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setCounterpartyId(thread.counterpartyCompanyId);
                    void handleLoadMessages(thread.threadId);
                  }}
                >
                  {thread.threadId.slice(0, 8)}… → {thread.counterpartyCompanyId.slice(0, 8)}…
                </button>
              </div>
            ))}
            <label>
              Mesaj
              <input
                value={messageBody}
                onChange={(event) => setMessageBody(event.target.value)}
              />
            </label>
            <button type="button" onClick={() => void handleSendMessage()} disabled={isBusy}>
              Gönder
            </button>
            {messages.length > 0 ? (
              <pre>{JSON.stringify(messages, null, 2)}</pre>
            ) : null}
          </section>

          <section className="card">
            <h2>Güven skoru</h2>
            <label>
              Firma ID
              <input
                value={trustCompanyId}
                onChange={(event) => setTrustCompanyId(event.target.value)}
              />
            </label>
            <button type="button" onClick={() => void handleLoadTrust()} disabled={isBusy}>
              Skoru getir
            </button>
            <label>
              Puan (1–5)
              <input
                type="number"
                min={1}
                max={5}
                value={trustScore}
                onChange={(event) => setTrustScore(Number(event.target.value))}
              />
            </label>
            <label>
              Yorum
              <input
                value={trustComment}
                onChange={(event) => setTrustComment(event.target.value)}
              />
            </label>
            <button type="button" onClick={() => void handleSubmitTrust()} disabled={isBusy}>
              Değerlendirme gönder
            </button>
            {trustSnapshot ? (
              <pre>{JSON.stringify(trustSnapshot, null, 2)}</pre>
            ) : null}
          </section>

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
