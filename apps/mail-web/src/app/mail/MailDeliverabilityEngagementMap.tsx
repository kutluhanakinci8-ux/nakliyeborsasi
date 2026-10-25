"use client";

import { useMailLocale } from "@/lib/MailLocaleProvider";

type DayRow = { day: string; opens: number; clicks: number };
type ProviderRow = { provider: string; opens: number; clicks: number };

const PROVIDER_BRAND_LABELS: Record<string, string> = {
  gmail: "Gmail",
  outlook: "Outlook / Microsoft",
  yahoo: "Yahoo",
  apple_mail: "Apple Mail",
  thunderbird: "Thunderbird",
};

type Props = {
  dailyOpenClick: DayRow[];
  providerBreakdown: ProviderRow[];
};

export function MailDeliverabilityEngagementMap({
  dailyOpenClick,
  providerBreakdown,
}: Props) {
  const { t } = useMailLocale();

  function providerLabel(key: string): string {
    if (PROVIDER_BRAND_LABELS[key]) {
      return PROVIDER_BRAND_LABELS[key];
    }
    if (key === "other") {
      return t("delivProviderOther");
    }
    if (key === "unknown") {
      return t("delivProviderUnknown");
    }
    return key;
  }

  const maxVal = Math.max(
    1,
    ...dailyOpenClick.map((d) => Math.max(d.opens, d.clicks)),
  );
  return (
    <div className="mail-deliverability-engagement-map">
      {dailyOpenClick.length > 0 ? (
        <div className="mail-deliverability-heatmap">
          <h4 className="mail-deliverability-map-title">
            {t("delivMapHeatmapTitle")}
          </h4>
          <ul className="mail-deliverability-heatmap-grid">
            {dailyOpenClick.map((row) => (
              <li key={row.day} className="mail-deliverability-heatmap-cell">
                <span className="mail-deliverability-heatmap-day">
                  {row.day.slice(5)}
                </span>
                <span
                  className="mail-deliverability-heatmap-bar mail-deliverability-heatmap-bar--open"
                  style={{ height: `${Math.round((row.opens / maxVal) * 100)}%` }}
                  title={t("delivMapOpenTitle", { count: row.opens })}
                />
                <span
                  className="mail-deliverability-heatmap-bar mail-deliverability-heatmap-bar--click"
                  style={{ height: `${Math.round((row.clicks / maxVal) * 100)}%` }}
                  title={t("delivMapClickTitle", { count: row.clicks })}
                />
              </li>
            ))}
          </ul>
          <p className="mail-deliverability-heatmap-legend">
            <span className="mail-deliverability-legend-open">
              {t("delivMapLegendOpen")}
            </span>
            <span className="mail-deliverability-legend-click">
              {t("delivMapLegendClick")}
            </span>
          </p>
        </div>
      ) : null}
      {providerBreakdown.length > 0 ? (
        <div className="mail-deliverability-provider-table-wrap">
          <h4 className="mail-deliverability-map-title">
            {t("delivMapProviderTitle")}
          </h4>
          <table className="mail-deliverability-provider-table">
            <thead>
              <tr>
                <th>{t("delivMapProviderCol")}</th>
                <th>{t("delivMapLegendOpen")}</th>
                <th>{t("delivMapLegendClick")}</th>
              </tr>
            </thead>
            <tbody>
              {providerBreakdown.map((row) => (
                <tr key={row.provider}>
                  <td>{providerLabel(row.provider)}</td>
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
