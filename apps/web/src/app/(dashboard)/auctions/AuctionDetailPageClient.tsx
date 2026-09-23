"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AuctionPlaceBidDialog,
  type AuctionPlaceBidContext,
} from "../../../components/AuctionPlaceBidDialog";
import { CountryFlag } from "../../../components/CountryFlag";
import { FreightRouteCountryBadges, FreightRouteHeading } from "../../../components/FreightRouteHeading";
import { ModulePageShell } from "../../../components/ModulePageShell";
import { useWebSession } from "../../../context/WebSessionProvider";
import {
  AuctionApiClient,
  type AuctionSessionDetail,
} from "../../../lib/AuctionApiClient";
import { formatLoadingDateTr } from "../../../lib/freightLocationDisplay";
import {
  formatPaymentDeferTr,
  formatPaymentFormTr,
  formatVatInclusionTr,
} from "../../../lib/paymentFormDisplay";
import { formatParticipantType } from "../../../lib/PlatformAdminApiClient";
import { useAuctionPolling } from "../../../hooks/useAuctionPolling";

function formatEquipmentLabel(equipmentType: string): string {
  const map: Record<string, string> = {
    TAUTLINER: "Tenteli",
    REFRIGERATED: "Frigo",
    FLATBED: "Açık platform",
  };
  return map[equipmentType] ?? equipmentType;
}

function sessionStatusLabel(statusCode: string): string {
  return statusCode === "OPEN" ? "Açık" : "Kapalı";
}

type AuctionDetailPageClientProps = {
  sessionId: string;
};

export function AuctionDetailPageClient({ sessionId }: AuctionDetailPageClientProps) {
  const router = useRouter();
  const { accessToken, locale } = useWebSession();
  const [detail, setDetail] = useState<AuctionSessionDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [bidDialogOpen, setBidDialogOpen] = useState(false);
  const [bidError, setBidError] = useState("");
  const [bidSubmitting, setBidSubmitting] = useState(false);

  const loadDetail = useCallback(async (): Promise<void> => {
    setErrorMessage("");
    try {
      const payload = await AuctionApiClient.getSessionDetail(
        accessToken,
        locale,
        sessionId,
      );
      setDetail(payload);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Yükleme hatası");
      setDetail(null);
    }
  }, [accessToken, locale, sessionId]);

  const refreshLive = useCallback(async (): Promise<void> => {
    try {
      const live = await AuctionApiClient.getSessionLive(
        accessToken,
        locale,
        sessionId,
      );
      setDetail((current) => {
        if (!current || current.session.statusCode !== "OPEN") {
          return current;
        }
        return {
          ...current,
          session: {
            ...current.session,
            endsAt: live.endsAt,
            statusCode: live.statusCode,
          },
          competition: live.competition,
        };
      });
    } catch {
      /* polling errors are non-fatal */
    }
  }, [accessToken, locale, sessionId]);

  useEffect(() => {
    setIsBusy(true);
    void loadDetail().finally(() => setIsBusy(false));
  }, [loadDetail]);

  useAuctionPolling({
    enabled: detail?.session.statusCode === "OPEN",
    intervalMs: 15_000,
    onTick: refreshLive,
  });

  async function submitBid(amount: number): Promise<void> {
    if (!detail) {
      return;
    }
    setBidSubmitting(true);
    setBidError("");
    try {
      await AuctionApiClient.placeBid(
        accessToken,
        locale,
        detail.session.id,
        amount,
      );
      setBidDialogOpen(false);
      setIsBusy(true);
      await loadDetail();
    } catch (error) {
      setBidError(error instanceof Error ? error.message : "Teklif hatası");
    } finally {
      setBidSubmitting(false);
      setIsBusy(false);
    }
  }

  const listing = detail?.listing;
  const session = detail?.session;
  const owner = detail?.ownerCompany;
  const competition = detail?.competition;
  const isOpen = session?.statusCode === "OPEN";
  const listingPrice = listing?.price;

  const bidDialogContext: AuctionPlaceBidContext | null =
    detail && listing && session && competition
      ? {
          sessionId: session.id,
          title: `İhale #${session.id.slice(0, 8)}`,
          referenceCeiling: session.minimumBidAmount,
          currencyCode: session.currencyCode,
          endsAt: session.endsAt,
          auctionTypeCode: session.auctionTypeCode,
          competition,
          terms: session,
        }
      : null;

  return (
    <ModulePageShell
      eyebrow="İhale detayı"
      title={session ? `İhale #${session.id.slice(0, 8)}` : "İhale"}
      lead="İlanı açan firma, şartname, ödeme koşulları ve teklif geçmişi tek ekranda."
      action={
        <Link href="/auctions" className="btn-secondary btn-secondary--light">
          ← İhale listesi
        </Link>
      }
    >
      {errorMessage ? <p className="error banner error--light">{errorMessage}</p> : null}
      {isBusy && !detail ? <p className="loading-inline">İhale yükleniyor…</p> : null}

      {detail && listing && session && owner ? (
        <>
          <div className="auction-detail-top">
            <div className="freight-row-badges freight-row-badges--top auction-detail-badges">
              <span className="badge badge--country">{sessionStatusLabel(session.statusCode)}</span>
              <FreightRouteCountryBadges
                originCountry={listing.origin.countryCode}
                destinationCountry={listing.destination.countryCode}
              />
              <span className="badge badge--muted">
                {formatEquipmentLabel(listing.equipmentType)}
              </span>
              <span className="badge badge--muted">{listing.weightTonnes} t</span>
            </div>
            <div className="freight-row-actions freight-row-actions--top auction-detail-actions">
              <span className="freight-row-loading-date">
                Yükleme {formatLoadingDateTr(listing.loadingDateStart)}
              </span>
              <button
                type="button"
                className="btn-link btn-link--compact"
                onClick={() =>
                  router.push(
                    `/messaging?companyId=${encodeURIComponent(owner.companyId)}`,
                  )
                }
              >
                Mesaj
              </button>
              <button
                type="button"
                className="btn-link btn-link--compact"
                onClick={() =>
                  router.push(`/trust?companyId=${encodeURIComponent(owner.companyId)}`)
                }
              >
                Güven profili
              </button>
              {isOpen ? (
                <button
                  type="button"
                  className="btn-accent btn-accent--compact"
                  onClick={() => {
                    setBidError("");
                    setBidDialogOpen(true);
                  }}
                >
                  Teklif ver
                </button>
              ) : null}
            </div>
          </div>

          <section className="module-panel auction-detail-route">
            <FreightRouteHeading
              origin={listing.origin}
              destination={listing.destination}
            />
            <p className="auction-detail-meta">
              Bitiş: {new Date(session.endsAt).toLocaleString(locale)} · Tavan{" "}
              {session.minimumBidAmount} {session.currencyCode}
              {competition?.bestBidAmount
                ? ` · L1: ${competition.bestBidAmount} ${session.currencyCode}`
                : ""}
              {session.bidStepAmount
                ? ` · Min. düşüş adımı ${session.bidStepAmount} ${session.currencyCode}`
                : ""}
              {session.autoExtendMinutes > 0
                ? ` · Son ${session.autoExtendWindowMinutes} dk teklif +${session.autoExtendMinutes} dk`
                : ""}
              {listingPrice
                ? ` · İlan referans: ${listingPrice.amount.toLocaleString("tr-TR")} ${listingPrice.currencyCode}`
                : ""}
            </p>
          </section>

          <section className="module-panel auction-detail-terms">
            <h2 className="auction-detail-h2">Şartname ve ödeme</h2>
            <dl className="auction-detail-spec-grid auction-detail-payment-grid">
              <div>
                <dt>Ödeme şekli</dt>
                <dd>{formatPaymentFormTr(session.paymentFormCode)}</dd>
              </div>
              <div>
                <dt>Ödeme süresi</dt>
                <dd>
                  {formatPaymentDeferTr(
                    session.paymentFormCode,
                    session.paymentDeferDays,
                  )}
                </dd>
              </div>
              <div>
                <dt>Fiyat</dt>
                <dd>{formatVatInclusionTr(session.priceIncludesVat)}</dd>
              </div>
              {session.bidStepAmount ? (
                <div>
                  <dt>Teklif adımı (düşüş)</dt>
                  <dd>
                    {Number(session.bidStepAmount).toLocaleString("tr-TR")}{" "}
                    {session.currencyCode}
                  </dd>
                </div>
              ) : null}
            </dl>
            {session.termsSummary ? (
              <div className="auction-detail-terms-body">
                <h3 className="auction-detail-h3">Taşıma şartları</h3>
                <p className="auction-detail-terms-text">{session.termsSummary}</p>
              </div>
            ) : (
              <p className="module-hint">Şartname metni henüz girilmemiş.</p>
            )}
            {session.specDocumentUrl ? (
              <p className="auction-detail-spec-doc">
                <a
                  href={session.specDocumentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="press-premium-inline-link"
                >
                  {session.specDocumentLabel ?? "Şartname belgesi"} (PDF)
                </a>
              </p>
            ) : null}
          </section>

          <section className="module-panel auction-detail-owner">
            <h2 className="auction-detail-h2">İlanı açan firma</h2>
            <div className="auction-detail-owner-card">
              <CountryFlag code={owner.countryCode} size="md" />
              <div>
                <p className="auction-detail-owner-name">{owner.legalName}</p>
                <p className="auction-detail-owner-meta">
                  {formatParticipantType(owner.participantTypeCode)} ·{" "}
                  {owner.countryCode}
                  {owner.trustReviewCount > 0
                    ? ` · Güven ${owner.trustScore} (${owner.trustReviewCount} değerlendirme)`
                    : " · Henüz değerlendirme yok"}
                </p>
              </div>
              <Link
                href={`/marketplace`}
                className="press-premium-inline-link auction-detail-market-link"
              >
                Marketplace ilanı
              </Link>
            </div>
          </section>

          <section className="module-panel auction-detail-spec">
            <h2 className="auction-detail-h2">Yük ve taşıma özellikleri</h2>
            {session.cargoDescription ? (
              <p className="auction-detail-cargo">{session.cargoDescription}</p>
            ) : null}
            <dl className="auction-detail-spec-grid">
              <div>
                <dt>Araç tipi</dt>
                <dd>{formatEquipmentLabel(listing.equipmentType)}</dd>
              </div>
              <div>
                <dt>Ağırlık</dt>
                <dd>{listing.weightTonnes} t</dd>
              </div>
              <div>
                <dt>Yükleme tarihi</dt>
                <dd>{formatLoadingDateTr(listing.loadingDateStart)}</dd>
              </div>
              <div>
                <dt>Pazar kapsamı</dt>
                <dd>{listing.marketScope}</dd>
              </div>
              <div>
                <dt>İlan kimliği</dt>
                <dd>
                  <code>{listing.listingId.slice(0, 8)}…</code>
                </dd>
              </div>
            </dl>
          </section>

          <section className="module-panel auction-detail-bids">
            <h2 className="auction-detail-h2">Canlı sıra (L1/L2)</h2>
            {competition && competition.leaderboard.length > 0 ? (
              <ul className="auction-detail-bid-list auction-leaderboard">
                {competition.leaderboard.map((entry) => (
                  <li
                    key={`${entry.rank}-${entry.bidAmount}`}
                    className={
                      entry.isOwnCompany ? "auction-leaderboard-row--own" : ""
                    }
                  >
                    <span className="auction-detail-bid-amount">
                      L{entry.rank} ·{" "}
                      {Number(entry.bidAmount).toLocaleString("tr-TR")}{" "}
                      {session.currencyCode}
                    </span>
                    <span className="auction-detail-bid-meta">
                      {entry.isOwnCompany
                        ? "Sizin teklifiniz"
                        : entry.bidderCompanyId
                          ? `Firma ${entry.bidderCompanyId.slice(0, 8)}…`
                          : "Rakip (anonim)"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="module-hint">Henüz teklif yok.</p>
            )}
          </section>
        </>
      ) : null}

      <AuctionPlaceBidDialog
        open={bidDialogOpen}
        context={bidDialogContext}
        isSubmitting={bidSubmitting}
        errorMessage={bidError}
        onClose={() => setBidDialogOpen(false)}
        onSubmit={(amount) => void submitBid(amount)}
      />
    </ModulePageShell>
  );
}
