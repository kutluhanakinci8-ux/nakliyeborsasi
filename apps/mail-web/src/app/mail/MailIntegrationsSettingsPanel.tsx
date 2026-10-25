"use client";

import { useMailLocale } from "@/lib/MailLocaleProvider";

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
  const { t } = useMailLocale();
  return (
    <div className="mail-integrations-panel mail-integrations-panel--premium">
      <p className="mail-posta-intro">{t("integrationsIntro")}</p>

      <ul className="mail-help-topic-list">
        <li className="mail-posta-card mail-help-topic-card">
          <div className="mail-help-topic-icon" aria-hidden="true">📬</div>
          <div className="mail-help-topic-body">
            <h3 className="mail-help-topic-title">{t("integrationsImapTitle")}</h3>
            <p className="mail-help-topic-desc">{t("integrationsImapDesc")}</p>
            <button
              type="button"
              className="mail-premium-btn mail-premium-btn--primary"
              onClick={onOpenImap}
            >
              {t("integrationsImapBtn")}
            </button>
          </div>
        </li>
        <li className="mail-posta-card mail-help-topic-card">
          <div className="mail-help-topic-icon" aria-hidden="true">📅</div>
          <div className="mail-help-topic-body">
            <h3 className="mail-help-topic-title">{t("integrationsCalTitle")}</h3>
            <p className="mail-help-topic-desc">{t("integrationsCalDesc")}</p>
            <button
              type="button"
              className="mail-premium-btn mail-premium-btn--primary"
              onClick={onOpenCalendarSettings}
            >
              {t("integrationsCalBtn")}
            </button>
          </div>
        </li>
        <li className="mail-posta-card mail-help-topic-card">
          <div className="mail-help-topic-icon" aria-hidden="true">👥</div>
          <div className="mail-help-topic-body">
            <h3 className="mail-help-topic-title">{t("integrationsContactsTitle")}</h3>
            <p className="mail-help-topic-desc">{t("integrationsContactsDesc")}</p>
            <button
              type="button"
              className="mail-premium-btn mail-premium-btn--primary"
              onClick={onOpenContactsSettings}
            >
              {t("integrationsContactsBtn")}
            </button>
          </div>
        </li>
        <li className="mail-posta-card mail-help-topic-card">
          <div className="mail-help-topic-icon" aria-hidden="true">🔗</div>
          <div className="mail-help-topic-body">
            <h3 className="mail-help-topic-title">{t("integrationsApiTitle")}</h3>
            <p className="mail-help-topic-desc">{t("integrationsApiDesc")}</p>
            <button
              type="button"
              className="mail-premium-btn mail-premium-btn--ghost"
              onClick={onOpenDeliverability}
            >
              {t("integrationsApiBtn")}
            </button>
          </div>
        </li>
      </ul>

      <section className="mail-posta-card mail-posta-card--muted">
        <h3 className="mail-posta-card-title">{t("integrationsOutlookMobileTitle")}</h3>
        <p className="mail-posta-card-desc">
          {t("integrationsOutlookMobileDesc")}{" "}
          <a href="/help/imap#outlook-mobile" target="_blank" rel="noopener noreferrer">
            {t("integrationsOutlookMobileLink")}
          </a>
          .
        </p>
      </section>
    </div>
  );
}
