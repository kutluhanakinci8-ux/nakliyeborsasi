"use client";

import {
  FreightRouteCountryBadges,
  FreightRouteHeading,
} from "./FreightRouteHeading";
import {
  formatLoadingDateTr,
  resolveFreightLocationPoint,
  type FreightLocationPoint,
} from "../lib/freightLocationDisplay";

type FreightListingRowProps = {
  listingId: string;
  origin: FreightLocationPoint;
  destination: FreightLocationPoint;
  equipmentType: string;
  weightTonnes: number;
  loadingDateStart?: string | null;
  priceAmount: number | null;
  priceCurrency: string | null;
  onMessage: () => void;
  onTrust: () => void;
  onAuction: () => void;
};

function formatEquipmentLabel(equipmentType: string): string {
  const map: Record<string, string> = {
    TAUTLINER: "Tenteli",
    REFRIGERATED: "Frigo",
    FLATBED: "Açık platform",
  };
  return map[equipmentType] ?? equipmentType;
}

export function FreightListingRow({
  origin,
  destination,
  equipmentType,
  weightTonnes,
  loadingDateStart,
  priceAmount,
  priceCurrency,
  onMessage,
  onTrust,
  onAuction,
}: FreightListingRowProps) {
  const originResolved = resolveFreightLocationPoint(origin, "origin");
  const destinationResolved = resolveFreightLocationPoint(destination, "destination");

  const loadingMeta = loadingDateStart
    ? `Yükleme ${formatLoadingDateTr(loadingDateStart)}`
    : null;

  return (
    <article className="freight-row">
      <div className="freight-row-main">
        <FreightRouteHeading
          origin={originResolved}
          destination={destinationResolved}
        />
        {loadingMeta ? <p className="freight-row-meta">{loadingMeta}</p> : null}
        <div className="freight-row-footer">
          <div className="freight-row-actions freight-row-actions--footer">
            <button type="button" className="btn-link" onClick={onMessage}>
              Mesaj
            </button>
            <button type="button" className="btn-link" onClick={onTrust}>
              Güven profili
            </button>
            <button type="button" className="btn-accent" onClick={onAuction}>
              İhale aç
            </button>
          </div>
          <div className="freight-row-badges freight-row-badges--footer">
            <FreightRouteCountryBadges
              originCountry={originResolved.countryCode}
              destinationCountry={destinationResolved.countryCode}
            />
            <span className="badge badge--muted">
              {formatEquipmentLabel(equipmentType)}
            </span>
            <span className="badge badge--muted">{weightTonnes} t</span>
          </div>
        </div>
      </div>
      <div className="freight-row-price">
        {priceAmount != null && priceCurrency ? (
          <>
            <span className="price-amount">
              {priceAmount.toLocaleString("tr-TR")} {priceCurrency}
            </span>
            <span className="price-hint">Platform fiyatı</span>
          </>
        ) : (
          <span className="price-hint">Fiyat sor</span>
        )}
      </div>
    </article>
  );
}
