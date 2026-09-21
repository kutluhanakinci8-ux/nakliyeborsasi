type MarketplaceStatsStripProps = {
  listingCount: number;
  corridorLabel: string;
};

export function MarketplaceStatsStrip({
  listingCount,
  corridorLabel,
}: MarketplaceStatsStripProps) {
  return (
    <div className="stats-strip">
      <div className="stat-item">
        <span className="stat-item-value">{listingCount}</span>
        <span className="stat-item-label">Açık ilan</span>
      </div>
      <div className="stat-item">
        <span className="stat-item-value">TR · UA · EU</span>
        <span className="stat-item-label">{corridorLabel}</span>
      </div>
      <div className="stat-item stat-item--highlight">
        <span className="stat-item-value">Canlı</span>
        <span className="stat-item-label">Demo borsa</span>
      </div>
    </div>
  );
}
