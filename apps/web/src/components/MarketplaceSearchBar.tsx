"use client";

type MarketplaceSearchBarProps = {
  originQuery: string;
  destinationQuery: string;
  equipmentFilter: string;
  onOriginChange: (value: string) => void;
  onDestinationChange: (value: string) => void;
  onEquipmentChange: (value: string) => void;
  onSearch: () => void;
  isBusy: boolean;
  resultCount: number;
  /** Hero satırında; ayrı kart başlığı olmadan */
  variant?: "panel" | "embedded";
};

export function MarketplaceSearchBar({
  originQuery,
  destinationQuery,
  equipmentFilter,
  onOriginChange,
  onDestinationChange,
  onEquipmentChange,
  onSearch,
  isBusy,
  resultCount,
  variant = "panel",
}: MarketplaceSearchBarProps) {
  const fields = (
    <div
      className={
        variant === "embedded"
          ? "search-fields search-fields--hero"
          : "search-fields"
      }
    >
      <label className="search-field">
        <span>Nereden</span>
        <input
          placeholder="Örn. Ankara, Antalya"
          value={originQuery}
          onChange={(event) => onOriginChange(event.target.value)}
        />
      </label>
      <label className="search-field">
        <span>Nereye</span>
        <input
          placeholder="Örn. Odesa, Berlin"
          value={destinationQuery}
          onChange={(event) => onDestinationChange(event.target.value)}
        />
      </label>
      <label className="search-field search-field--narrow">
        <span>Araç</span>
        <select
          value={equipmentFilter}
          onChange={(event) => onEquipmentChange(event.target.value)}
        >
          <option value="">Tümü</option>
          <option value="TAUTLINER">Tenteli</option>
          <option value="REFRIGERATED">Frigo</option>
          <option value="FLATBED">Açık</option>
        </select>
      </label>
      <button
        type="button"
        className="btn-search"
        onClick={onSearch}
        disabled={isBusy}
      >
        {isBusy ? "Aranıyor…" : "Ara"}
      </button>
    </div>
  );

  if (variant === "embedded") {
    return (
      <div className="exchange-hero-search" aria-label="Yük arama">
        {fields}
      </div>
    );
  }

  return (
    <section className="search-panel" aria-label="Yük arama">
      <div className="search-panel-head">
        <h2 className="search-panel-title">Kargo ve ulaşım arama</h2>
        <p className="search-panel-sub">
          TR · UA · EU koridoru — platform ilanları
        </p>
      </div>
      {fields}
      <p className="search-meta">
        Bulundu: <strong>{resultCount}</strong> ilan
      </p>
    </section>
  );
}
