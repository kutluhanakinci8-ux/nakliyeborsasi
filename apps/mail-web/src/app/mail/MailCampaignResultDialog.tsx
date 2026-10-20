"use client";

import type { ComposeCampaignResult } from "@/lib/mailApi";

type Props = {
  result: ComposeCampaignResult | null;
  onClose: () => void;
};

export function MailCampaignResultDialog({ result, onClose }: Props) {
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
            <h2 id="campaign-result-title">Kampanya özeti</h2>
            <p className="compose-premium-subtitle">Kampanya ID: {result.campaignId}</p>
          </div>
          <button type="button" className="compose-premium-close" aria-label="Kapat" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="compose-premium-body">
          <ul className="mail-campaign-result-stats">
            <li>Gönderilen: <strong>{result.sent}</strong> / {result.attempted}</li>
            <li>Suppression (atlandı): {result.skippedSuppressed}</li>
            <li>Başarısız: {result.failed.length}</li>
          </ul>
          {result.failed.length > 0 ? (
            <>
              <h3 className="mail-deliverability-subhead">Başarısız alıcılar</h3>
              <ul className="mail-campaign-result-failures">
                {result.failed.map((row) => (
                  <li key={row.email}>
                    <code>{row.email}</code> — {row.error}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="compose-attach-hint">Tüm gönderimler tamamlandı veya suppression nedeniyle atlandı.</p>
          )}
          <p className="compose-attach-hint">
            Pazarlama gönderimlerinde abonelik iptali linki ve List-Unsubscribe başlığı otomatik eklenir.
          </p>
        </div>
      </div>
    </div>
  );
}
