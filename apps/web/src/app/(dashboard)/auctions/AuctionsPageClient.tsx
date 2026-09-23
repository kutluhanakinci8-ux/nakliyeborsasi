"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AuctionPlaceBidDialog,
  type AuctionPlaceBidContext,
} from "../../../components/AuctionPlaceBidDialog";
import { EmptyState } from "../../../components/EmptyState";
import { ModulePageShell } from "../../../components/ModulePageShell";
import { useWebSession } from "../../../context/WebSessionProvider";
import { useAuctionPolling } from "../../../hooks/useAuctionPolling";
import {
  AuctionApiClient,
  type AuctionCompetitionSnapshot,
  type AuctionSessionRecord,
} from "../../../lib/AuctionApiClient";

type AuctionTab = "open" | "closed";

const EMPTY_COMPETITION: AuctionCompetitionSnapshot = {
  bidCount: 0,
  bestBidAmount: null,
  myBidAmount: null,
  myRank: null,
  leaderboard: [],
};

function competitionOf(session: AuctionSessionRecord): AuctionCompetitionSnapshot {
  return session.competition ?? EMPTY_COMPETITION;
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
  const [bidDialog, setBidDialog] = useState<AuctionPlaceBidContext | null>(null);
  const [bidError, setBidError] = useState("");
  const [bidSubmitting, setBidSubmitting] = useState(false);

  const loadAuctions = useCallback(async (): Promise<void> => {
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
  }, [accessToken, locale]);

  useEffect(() => {
    void loadAuctions();
  }, [loadAuctions]);

  useAuctionPolling({
    enabled: activeTab === "open",
    intervalMs: 20_000,
    onTick: loadAuctions,
  });

  const totalBids = useMemo(() => {
    return [...openAuctions, ...closedAuctions].reduce(
      (sum, session) => sum + (session.competition?.bidCount ?? session.bids?.length ?? 0),
      0,
    );
  }, [openAuctions, closedAuctions]);

  function openBidDialog(session: AuctionSessionRecord): void {
    const competition = competitionOf(session);
    setBidError("");
    setBidDialog({
      sessionId: session.id,
      title: `İhale #${session.id.slice(0, 8)}`,
      referenceCeiling: session.minimumBidAmount,
      currencyCode: session.currencyCode,
      endsAt: session.endsAt,
      auctionTypeCode: session.auctionTypeCode ?? "REVERSE_OPEN",
      competition,
      terms: null,
    });
  }

  async function submitBid(amount: number): Promise<void> {
    if (!bidDialog) {
      return;
    }
    setBidSubmitting(true);
    setBidError("");
    try {
      await AuctionApiClient.placeBid(
        accessToken,
        locale,
        bidDialog.sessionId,
        amount,
      );
      setBidDialog(null);
      await loadAuctions();
    } catch (error) {
      setBidError(error instanceof Error ? error.message : "Teklif hatası");
    } finally {
      setBidSubmitting(false);
    }
  }

  const visibleSessions = activeTab === "open" ? openAuctions : closedAuctions;

  return (
    <ModulePageShell
      eyebrow="İhaleler"
      title="Teklif oturumları"
      lead="Ters ihale: en düşük uygun teklif öne çıkar. Canlı sıra (L1/L2) ve otomatik süre uzatma aktif."
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
            const competition = competitionOf(session);
            const best = competition.bestBidAmount;
            return (
              <article key={session.id} className="freight-row module-row">
                <div className="freight-row-main">
                  <div className="freight-row-badges">
                    <span className="badge badge--country">
                      {activeTab === "open" ? "Açık" : "Kapalı"}
                    </span>
                    <span className="badge badge--muted">
                      Tavan {session.minimumBidAmount} {session.currencyCode}
                    </span>
                    <span className="badge badge--muted">
                      {competition.bidCount} teklif
                    </span>
                    {competition.myRank ? (
                      <span className="badge badge--accent">
                        Siz: L{competition.myRank}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="freight-route">
                    <Link
                      href={`/auctions/${session.id}`}
                      className="auction-list-title-link"
                    >
                      İhale #{session.id.slice(0, 8)}
                    </Link>
                  </h3>
                  <p className="module-row-meta">
                    Bitiş: {new Date(session.endsAt).toLocaleString(locale)}
                    {best ? ` · En iyi (L1): ${best} ${session.currencyCode}` : ""}
                    {activeTab === "closed"
                      ? ` · Kazanan: ${formatWinner(session)}`
                      : ""}
                  </p>
                  <div className="freight-row-actions">
                    <Link href={`/auctions/${session.id}`} className="btn-link">
                      Detay ve şartlar
                    </Link>
                    {activeTab === "open" ? (
                      <button
                        type="button"
                        className="btn-accent"
                        onClick={() => openBidDialog(session)}
                      >
                        Teklif ver
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="freight-row-price">
                  <span className="price-amount">
                    {best ?? session.minimumBidAmount} {session.currencyCode}
                  </span>
                  <span className="price-hint">
                    {best ? "En iyi teklif" : "Referans tavan"}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <AuctionPlaceBidDialog
        open={bidDialog !== null}
        context={bidDialog}
        isSubmitting={bidSubmitting}
        errorMessage={bidError}
        onClose={() => setBidDialog(null)}
        onSubmit={(amount) => void submitBid(amount)}
      />
    </ModulePageShell>
  );
}
