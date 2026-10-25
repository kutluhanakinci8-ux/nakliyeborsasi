"use client";

import type { ComposeCampaignResult } from "@/lib/mailApi";
import { useMailLocale } from "@/lib/MailLocaleProvider";

type Props = {
  result: ComposeCampaignResult | null;
  onClose: () => void;
};

export function MailCampaignResultDialog({ result, onClose }: Props) {
  const { t } = useMailLocale();
  if (!result) {
    return null;
  }
  return (
    <div className="compose-overlay compose-preview-overlay" role="presentation" onClick={onClose}>
      <div
        className="compose-dialog compose-preview-dialog"
        role="dialog"
        aria-labelledby="campaign-result-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="compose-premium-header">
          <div className="compose-premium-header-text">
            <h2 id="campaign-result-title">{t("campaignResultTitle")}</h2>
            <p className="compose-premium-subtitle">
              {t("campaignResultCampaignId", { id: result.campaignId })}
            </p>
          </div>
          <button
            type="button"
            className="compose-premium-close"
            aria-label={t("actionClose")}
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="compose-premium-body">
          <ul className="mail-campaign-result-stats">
            <li>
              {t("campaignResultSent", {
                sent: result.sent,
                attempted: result.attempted,
              })}
            </li>
            <li>
              {t("campaignResultSkipped", { count: result.skippedSuppressed })}
            </li>
            <li>
              {t("campaignResultFailedCount", { count: result.failed.length })}
            </li>
          </ul>
          {result.failed.length > 0 ? (
            <>
              <h3 className="mail-deliverability-subhead">
                {t("campaignResultFailedRecipients")}
              </h3>
              <ul className="mail-campaign-result-failures">
                {result.failed.map((row) => (
                  <li key={row.email}>
                    <code>{row.email}</code> — {row.error}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="compose-attach-hint">{t("campaignResultAllDone")}</p>
          )}
          <p className="compose-attach-hint">{t("campaignResultUnsubscribeHint")}</p>
        </div>
      </div>
    </div>
  );
}
