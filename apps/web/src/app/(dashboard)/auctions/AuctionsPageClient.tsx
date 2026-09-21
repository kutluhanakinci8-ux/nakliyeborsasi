"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "../../../components/EmptyState";
import { PageHeader } from "../../../components/PageHeader";
import { useWebSession } from "../../../context/WebSessionProvider";
import {
  AuctionApiClient,
  AuctionSessionRecord,
} from "../../../lib/AuctionApiClient";

export function AuctionsPageClient() {
  const { accessToken, locale } = useWebSession();
  const [openAuctions, setOpenAuctions] = useState<AuctionSessionRecord[]>([]);
  const [closedAuctions, setClosedAuctions] = useState<AuctionSessionRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  async function loadAuctions(): Promise<void> {
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
      setErrorMessage(error instanceof Error ? error.message : "Yükleme hatası");
    } finally {
      setIsBusy(false);
    }
  }

  useEffect(() => {
    void loadAuctions();
  }, [accessToken, locale]);

  async function handlePlaceBid(sessionRecord: AuctionSessionRecord): Promise<void> {
    const bidAmount = Number(
      window.prompt("Teklif tutarı", sessionRecord.minimumBidAmount),
    );
    if (!bidAmount) {
      return;
    }
    try {
      await AuctionApiClient.placeBid(
        accessToken,
        locale,
        sessionRecord.id,
        bidAmount,
      );
      await loadAuctions();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Teklif hatası");
    }
  }

  function formatWinner(sessionRecord: AuctionSessionRecord): string {
    if (!sessionRecord.winningBidId || !sessionRecord.bids) {
      return "Kazanan yok";
    }
    const winningBid = sessionRecord.bids.find(
      (bid) => bid.id === sessionRecord.winningBidId,
    );
    if (!winningBid) {
      return "—";
    }
    return `${winningBid.bidAmount} · ${winningBid.bidderCompanyId.slice(0, 8)}…`;
  }

  return (
    <>
      <PageHeader
        title="İhaleler"
        description="Açık oturumlar ve kapanmış teklifler"
        action={
          <button type="button" className="btn-secondary" onClick={() => void loadAuctions()} disabled={isBusy}>
            Yenile
          </button>
        }
      />
      {errorMessage ? <p className="error banner">{errorMessage}</p> : null}
      <section className="section-block">
        <h2 className="section-title">Açık</h2>
        {openAuctions.length === 0 ? (
          <EmptyState message="Açık ihale yok." />
        ) : (
          <div className="listing-grid">
            {openAuctions.map((sessionRecord) => (
              <article key={sessionRecord.id} className="listing-card compact">
                <p className="muted">
                  Min {sessionRecord.minimumBidAmount} {sessionRecord.currencyCode}
                </p>
                <p className="muted">Bitiş: {new Date(sessionRecord.endsAt).toLocaleString()}</p>
                <button type="button" className="btn-primary" onClick={() => void handlePlaceBid(sessionRecord)}>
                  Teklif ver
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="section-block">
        <h2 className="section-title">Kapanmış</h2>
        {closedAuctions.length === 0 ? (
          <EmptyState message="Kapanmış ihale yok." />
        ) : (
          <ul className="data-list">
            {closedAuctions.map((sessionRecord) => (
              <li key={sessionRecord.id}>
                <span>{formatWinner(sessionRecord)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
