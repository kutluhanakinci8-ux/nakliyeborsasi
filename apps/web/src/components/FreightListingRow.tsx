"use client";

import {
  FreightRouteCountryBadges,
  FreightRouteHeading,
} from "./FreightRouteHeading";

type FreightListingRowProps = {
  listingId: string;
  originCity: string;
  originCountry: string;
  destinationCity: string;
  destinationCountry: string;
  equipmentType: string;
  weightTonnes: number;
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
  originCity,
  originCountry,
  destinationCity,
  destinationCountry,
  equipmentType,
  weightTonnes,
  priceAmount,
  priceCurrency,
  onMessage,
  onTrust,
  onAuction,
}: FreightListingRowProps) {
  return (
    <article className="freight-row">
      <div className="freight-row-main">
        <div className="freight-row-badges">
          <FreightRouteCountryBadges
            originCountry={originCountry}
            destinationCountry={destinationCountry}
          />
          <span className="badge badge--muted">{formatEquipmentLabel(equipmentType)}</span>
          <span className="badge badge--muted">{weightTonnes} t</span>
        </div>
        <FreightRouteHeading
          originCity={originCity}
          originCountry={originCountry}
          destinationCity={destinationCity}
          destinationCountry={destinationCountry}
        />
        <div className="freight-row-actions">
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
