"use client";

import type { EmailOutboxDetail } from "../../lib/PlatformAdminApiClient";

type Props = {
  message: EmailOutboxDetail | null;
  onClose: () => void;
};

export function AdminOutboxPreviewModal({ message, onClose }: Props) {
  if (!message) {
    return null;
  }

  return (
    <div className="pa-modal-backdrop" role="dialog" aria-modal="true">
      <div className="pa-modal">
        <header className="pa-modal-head">
          <div>
            <h2 className="pa-modal-title">{message.subject}</h2>
            <p className="pa-modal-meta">
              {message.recipientEmail} · {message.status} · {message.eventCode}
            </p>
          </div>
          <button type="button" className="pa-btn pa-btn--ghost" onClick={onClose}>
            Kapat
          </button>
        </header>
        <dl className="pa-preview-kv">
          <div>
            <dt>Oluşturulma</dt>
            <dd>{new Date(message.createdAt).toLocaleString("tr-TR")}</dd>
          </div>
          <div>
            <dt>Gönderim</dt>
            <dd>
              {message.sentAt
                ? new Date(message.sentAt).toLocaleString("tr-TR")
                : "—"}
            </dd>
          </div>
          <div>
            <dt>Açılma / tıklama</dt>
            <dd>
              {message.openCount} / {message.clickCount}
            </dd>
          </div>
          {message.lastError ? (
            <div>
              <dt>Hata</dt>
              <dd className="pa-outbox-error">{message.lastError}</dd>
            </div>
          ) : null}
        </dl>
        <div className="pa-preview-tabs">
          <section>
            <h3>HTML önizleme</h3>
            <iframe
              className="pa-preview-frame"
              title="E-posta HTML"
              sandbox=""
              srcDoc={message.htmlBody}
            />
          </section>
          <section>
            <h3>Düz metin</h3>
            <pre className="pa-preview-text">{message.textBody}</pre>
          </section>
        </div>
      </div>
    </div>
  );
}
