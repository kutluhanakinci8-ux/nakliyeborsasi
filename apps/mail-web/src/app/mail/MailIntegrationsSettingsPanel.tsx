"use client";

type Props = {
  onOpenImap: () => void;
  onOpenCalendarSettings: () => void;
  onOpenContactsSettings: () => void;
  onOpenDeliverability: () => void;
};

export function MailIntegrationsSettingsPanel({
  onOpenImap,
  onOpenCalendarSettings,
  onOpenContactsSettings,
  onOpenDeliverability,
}: Props) {
  return (
    <div className="mail-integrations-panel mail-integrations-panel--premium">
      <p className="mail-posta-intro">
        Harici istemciler ve kurumsal bağlantılar. Outlook mobil için IMAP
        adımları IMAP ekranında ve yardım rehberinde yer alır.
      </p>

      <ul className="mail-help-topic-list">
        <li className="mail-posta-card mail-help-topic-card">
          <div className="mail-help-topic-icon" aria-hidden="true">📬</div>
          <div className="mail-help-topic-body">
            <h3 className="mail-help-topic-title">IMAP / SMTP</h3>
            <p className="mail-help-topic-desc">
              Thunderbird, Outlook masaüstü, iOS Mail ve Outlook Android —
              sunucu bilgisi ve uygulama şifresi.
            </p>
            <button
              type="button"
              className="mail-premium-btn mail-premium-btn--primary"
              onClick={onOpenImap}
            >
              IMAP ayarları
            </button>
          </div>
        </li>
        <li className="mail-posta-card mail-help-topic-card">
          <div className="mail-help-topic-icon" aria-hidden="true">📅</div>
          <div className="mail-help-topic-body">
            <h3 className="mail-help-topic-title">Takvim (CalDAV)</h3>
            <p className="mail-help-topic-desc">
              Harici takvim hesapları ve senkron özeti.
            </p>
            <button
              type="button"
              className="mail-premium-btn mail-premium-btn--primary"
              onClick={onOpenCalendarSettings}
            >
              Takvim entegrasyonları
            </button>
          </div>
        </li>
        <li className="mail-posta-card mail-help-topic-card">
          <div className="mail-help-topic-icon" aria-hidden="true">👥</div>
          <div className="mail-help-topic-body">
            <h3 className="mail-help-topic-title">Kişiler (CardDAV)</h3>
            <p className="mail-help-topic-desc">
              Rehber senkronu ve CardDAV hesapları.
            </p>
            <button
              type="button"
              className="mail-premium-btn mail-premium-btn--primary"
              onClick={onOpenContactsSettings}
            >
              Kişi entegrasyonları
            </button>
          </div>
        </li>
        <li className="mail-posta-card mail-help-topic-card">
          <div className="mail-help-topic-icon" aria-hidden="true">🔗</div>
          <div className="mail-help-topic-body">
            <h3 className="mail-help-topic-title">Public API ve webhook</h3>
            <p className="mail-help-topic-desc">
              Teslimat panelinde webhook uç noktaları ve plan durumu.
            </p>
            <button
              type="button"
              className="mail-premium-btn mail-premium-btn--ghost"
              onClick={onOpenDeliverability}
            >
              Teslimat ve API
            </button>
          </div>
        </li>
      </ul>

      <section className="mail-posta-card mail-posta-card--muted">
        <h3 className="mail-posta-card-title">Outlook mobil</h3>
        <p className="mail-posta-card-desc">
          Microsoft Outlook uygulamasında <strong>Hesap ekle → Diğer</strong>,
          IMAP ile webmaildeki sunucu ve IMAP şifresini kullanın. Detaylı adımlar:{" "}
          <a href="/help/imap#outlook-mobile" target="_blank" rel="noopener noreferrer">
            mobil kurulum rehberi
          </a>
          .
        </p>
      </section>
    </div>
  );
}
