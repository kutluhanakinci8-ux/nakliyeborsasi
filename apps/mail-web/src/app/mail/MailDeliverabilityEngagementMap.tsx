"use client";

type DayRow = { day: string; opens: number; clicks: number };
type ProviderRow = { provider: string; opens: number; clicks: number };

const PROVIDER_LABELS: Record<string, string> = {
  gmail: "Gmail",
  outlook: "Outlook / Microsoft",
  yahoo: "Yahoo",
  apple_mail: "Apple Mail",
  thunderbird: "Thunderbird",
  other: "Diğer",
  unknown: "Bilinmeyen",
};

type Props = {
  dailyOpenClick: DayRow[];
  providerBreakdown: ProviderRow[];
};

export function MailDeliverabilityEngagementMap({
  dailyOpenClick,
  providerBreakdown,
}: Props) {
  const maxVal = Math.max(
    1,
    ...dailyOpenClick.map((d) => Math.max(d.opens, d.clicks)),
  );
  return (
    <div className="mail-deliverability-engagement-map">
      {dailyOpenClick.length > 0 ? (
        <div className="mail-deliverability-heatmap">
          <h4 className="mail-deliverability-map-title">Açılma / tıklama (gün)</h4>
          <ul className="mail-deliverability-heatmap-grid">
            {dailyOpenClick.map((row) => (
              <li key={row.day} className="mail-deliverability-heatmap-cell">
                <span className="mail-deliverability-heatmap-day">
                  {row.day.slice(5)}
                </span>
                <span
                  className="mail-deliverability-heatmap-bar mail-deliverability-heatmap-bar--open"
                  style={{ height: `${Math.round((row.opens / maxVal) * 100)}%` }}
                  title={`Açılma: ${row.opens}`}
                />
                <span
                  className="mail-deliverability-heatmap-bar mail-deliverability-heatmap-bar--click"
                  style={{ height: `${Math.round((row.clicks / maxVal) * 100)}%` }}
                  title={`Tıklama: ${row.clicks}`}
                />
              </li>
            ))}
          </ul>
          <p className="mail-deliverability-heatmap-legend">
            <span className="mail-deliverability-legend-open">Açılma</span>
            <span className="mail-deliverability-legend-click">Tıklama</span>
          </p>
        </div>
      ) : null}
      {providerBreakdown.length > 0 ? (
        <div className="mail-deliverability-provider-table-wrap">
          <h4 className="mail-deliverability-map-title">İstemci / sağlayıcı</h4>
          <table className="mail-deliverability-provider-table">
            <thead>
              <tr>
                <th>Sağlayıcı</th>
                <th>Açılma</th>
                <th>Tıklama</th>
              </tr>
            </thead>
            <tbody>
              {providerBreakdown.map((row) => (
                <tr key={row.provider}>
                  <td>{PROVIDER_LABELS[row.provider] ?? row.provider}</td>
                  <td>{row.opens}</td>
                  <td>{row.clicks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
