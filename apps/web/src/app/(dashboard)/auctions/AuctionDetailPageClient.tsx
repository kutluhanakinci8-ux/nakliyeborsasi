"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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

  const loadDetail = useCallback(async (): Promise<void> => {
    setIsBusy(true);
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
    } finally {
      setIsBusy(false);
    }
  }, [accessToken, locale, sessionId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  async function handlePlaceBid(): Promise<void> {
    if (!detail) {
      return;
    }
    const bidAmount = Number(
      window.prompt("Teklif tutarı", detail.session.minimumBidAmount),
    );
    if (!bidAmount) {
      return;
    }
    try {
      await AuctionApiClient.placeBid(
        accessToken,
        locale,
        detail.session.id,
        bidAmount,
      );
      await loadDetail();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Teklif hatası");
    }
  }

  const listing = detail?.listing;
  const session = detail?.session;
  const owner = detail?.ownerCompany;
  const isOpen = session?.statusCode === "OPEN";
  const listingPrice = listing?.price;

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
                  onClick={() => void handlePlaceBid()}
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
              Bitiş: {new Date(session.endsAt).toLocaleString(locale)} · Taban{" "}
              {session.minimumBidAmount} {session.currencyCode}
              {session.bidStepAmount
                ? ` · Min. artış ${session.bidStepAmount} ${session.currencyCode}`
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
                  <dt>Teklif artışı</dt>
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
            <h2 className="auction-detail-h2">Teklifler</h2>
            {session.bids.length === 0 ? (
              <p className="module-hint">Henüz teklif yok.</p>
            ) : (
              <ul className="auction-detail-bid-list">
                {session.bids.map((bid) => (
                  <li key={bid.id}>
                    <span className="auction-detail-bid-amount">
                      {Number(bid.bidAmount).toLocaleString("tr-TR")}{" "}
                      {session.currencyCode}
                    </span>
                    <span className="auction-detail-bid-meta">
                      Firma {bid.bidderCompanyId.slice(0, 8)}… ·{" "}
                      {bid.createdAt
                        ? new Date(bid.createdAt).toLocaleString(locale)
                        : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </ModulePageShell>
  );
}
