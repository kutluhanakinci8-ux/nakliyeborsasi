"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "../../../components/EmptyState";
import { ModulePageShell } from "../../../components/ModulePageShell";
import { useWebSession } from "../../../context/WebSessionProvider";
import {
  AuctionApiClient,
  AuctionSessionRecord,
} from "../../../lib/AuctionApiClient";

type AuctionTab = "open" | "closed";

function highestBid(session: AuctionSessionRecord): string | null {
  if (!session.bids?.length) {
    return null;
  }
  const sorted = [...session.bids].sort(
    (a, b) => Number(b.bidAmount) - Number(a.bidAmount),
  );
  return sorted[0]?.bidAmount ?? null;
}

function formatWinner(sessionRecord: AuctionSessionRecord): string {
  if (!sessionRecord.winningBidId || !sessionRecord.bids) {
    return "Teklif yok";
  }
  const winningBid = sessionRecord.bids.find(
    (bid) => bid.id === sessionRecord.winningBidId,
  );
  if (!winningBid) {
    return "—";
  }
  return `${winningBid.bidAmount} ${sessionRecord.currencyCode}`;
}

export function AuctionsPageClient() {
  const { accessToken, locale } = useWebSession();
  const [openAuctions, setOpenAuctions] = useState<AuctionSessionRecord[]>([]);
  const [closedAuctions, setClosedAuctions] = useState<AuctionSessionRecord[]>([]);
  const [activeTab, setActiveTab] = useState<AuctionTab>("open");
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

  const totalBids = useMemo(() => {
    return [...openAuctions, ...closedAuctions].reduce(
      (sum, session) => sum + (session.bids?.length ?? 0),
      0,
    );
  }, [openAuctions, closedAuctions]);

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

  const visibleSessions = activeTab === "open" ? openAuctions : closedAuctions;

  return (
    <ModulePageShell
      eyebrow="İhaleler"
      title="Teklif oturumları"
      lead="Açık ihalelere teklif verin, kapanan oturumlarda kazanan teklifi görün. Yeni ihale marketplace ilanından açılır."
      action={
        <button
          type="button"
          className="btn-secondary btn-secondary--light"
          onClick={() => void loadAuctions()}
          disabled={isBusy}
        >
          Yenile
        </button>
      }
      stats={[
        { value: String(openAuctions.length), label: "Açık ihale" },
        { value: String(closedAuctions.length), label: "Kapanmış" },
        { value: String(totalBids), label: "Toplam teklif", highlight: true },
      ]}
    >
      <div className="module-toolbar">
        <div className="module-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            className={activeTab === "open" ? "module-tab active" : "module-tab"}
            onClick={() => setActiveTab("open")}
          >
            Açık ({openAuctions.length})
          </button>
          <button
            type="button"
            role="tab"
            className={activeTab === "closed" ? "module-tab active" : "module-tab"}
            onClick={() => setActiveTab("closed")}
          >
            Kapanmış ({closedAuctions.length})
          </button>
        </div>
        <Link href="/marketplace" className="module-link-action">
          Marketplace → İhale aç
        </Link>
      </div>

      {errorMessage ? <p className="error banner error--light">{errorMessage}</p> : null}

      {isBusy && visibleSessions.length === 0 ? (
        <p className="loading-inline">İhaleler yükleniyor…</p>
      ) : null}

      {visibleSessions.length === 0 && !isBusy ? (
        <EmptyState
          message={
            activeTab === "open"
              ? "Açık ihale yok. Marketplace’te bir ilanda «İhale aç» kullanın."
              : "Henüz kapanmış ihale yok."
          }
        />
      ) : (
        <div className="freight-list">
          {visibleSessions.map((session) => {
            const topBid = highestBid(session);
            return (
              <article key={session.id} className="freight-row module-row">
                <div className="freight-row-main">
                  <div className="freight-row-badges">
                    <span className="badge badge--country">
                      {activeTab === "open" ? "Açık" : "Kapalı"}
                    </span>
                    <span className="badge badge--muted">
                      Min {session.minimumBidAmount} {session.currencyCode}
                    </span>
                    <span className="badge badge--muted">
                      {session.bids?.length ?? 0} teklif
                    </span>
                  </div>
                  <h3 className="freight-route">İhale #{session.id.slice(0, 8)}</h3>
                  <p className="module-row-meta">
                    Bitiş: {new Date(session.endsAt).toLocaleString(locale)}
                    {topBid ? ` · En yüksek: ${topBid} ${session.currencyCode}` : ""}
                    {activeTab === "closed"
                      ? ` · Kazanan: ${formatWinner(session)}`
                      : ""}
                  </p>
                  {activeTab === "open" ? (
                    <div className="freight-row-actions">
                      <button
                        type="button"
                        className="btn-accent"
                        onClick={() => void handlePlaceBid(session)}
                      >
                        Teklif ver
                      </button>
                    </div>
                  ) : null}
                </div>
                <div className="freight-row-price">
                  <span className="price-amount">
                    {session.minimumBidAmount} {session.currencyCode}
                  </span>
                  <span className="price-hint">Taban teklif</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </ModulePageShell>
  );
}
