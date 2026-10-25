"use client";

import type { MailCampaignSummary } from "@/lib/mailApi";
import type { MailDeliverabilityEngagement } from "@/lib/mailApi";
import { useMailLocale } from "@/lib/MailLocaleProvider";

type Props = {
  summary: MailCampaignSummary;
  engagement: MailDeliverabilityEngagement | null;
  loading?: boolean;
};

export function MailCampaignStatsCards({
  summary,
  engagement,
  loading,
}: Props) {
  const { t } = useMailLocale();

  if (loading) {
    return (
      <div className="mail-campaign-stat-grid" aria-busy="true">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="mail-campaign-stat-card mail-campaign-stat-card--skeleton" />
        ))}
      </div>
    );
  }

  const openRate =
    engagement?.openRatePercent != null
      ? `${engagement.openRatePercent}%`
      : "—";
  const clickRate =
    engagement?.clickRatePercent != null
      ? `${engagement.clickRatePercent}%`
      : "—";

  return (
    <div className="mail-campaign-stat-grid" role="group" aria-label={t("campaignStatsAria")}>
      <div className="mail-campaign-stat-card">
        <span className="mail-campaign-stat-label">{t("campaignStatCampaigns")}</span>
        <strong className="mail-campaign-stat-value">{summary.campaignsInWindow}</strong>
        <span className="mail-campaign-stat-hint">
          {t("campaignStatWindowDays", { days: summary.windowDays })}
        </span>
      </div>
      <div className="mail-campaign-stat-card">
        <span className="mail-campaign-stat-label">{t("campaignStatSent")}</span>
        <strong className="mail-campaign-stat-value">{summary.sentInWindow}</strong>
        <span className="mail-campaign-stat-hint">
          {t("campaignStatRecipients", { count: summary.recipientsInWindow })}
        </span>
      </div>
      <div className="mail-campaign-stat-card">
        <span className="mail-campaign-stat-label">{t("campaignStatOpenRate")}</span>
        <strong className="mail-campaign-stat-value">{openRate}</strong>
        <span className="mail-campaign-stat-hint">{t("campaignStatEngagementHint")}</span>
      </div>
      <div className="mail-campaign-stat-card">
        <span className="mail-campaign-stat-label">{t("campaignStatClickRate")}</span>
        <strong className="mail-campaign-stat-value">{clickRate}</strong>
        <span className="mail-campaign-stat-hint">
          {summary.averageSuccessRatePercent != null
            ? t("campaignStatSuccess", { pct: summary.averageSuccessRatePercent })
            : t("campaignStatNoSuccess")}
        </span>
      </div>
    </div>
  );
}
