"use client";

import { useMemo } from "react";
import type { SettingsView } from "./MailSettingsPanel";
import { useMailLocale } from "@/lib/MailLocaleProvider";

type Props = {
  onOpenSetting: (view: SettingsView) => void;
  onOpenCalendar?: () => void;
  onOpenContacts?: () => void;
};

type HelpTopic = {
  id: string;
  icon: string;
  title: string;
  description: string;
  settingView?: SettingsView;
  guideHref?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function MailHelpPanel({
  onOpenSetting,
  onOpenCalendar,
  onOpenContacts,
}: Props) {
  const { t } = useMailLocale();

  const topics: HelpTopic[] = useMemo(
    () => [
      {
        id: "start",
        icon: "✉️",
        title: t("helpTopicStartTitle"),
        description: t("helpTopicStartDesc"),
        settingView: "mailPrefs",
        actionLabel: t("helpTopicStartAction"),
      },
      {
        id: "accounts",
        icon: "👤",
        title: t("helpTopicAccountsTitle"),
        description: t("helpTopicAccountsDesc"),
        settingView: "accounts",
        actionLabel: t("helpTopicAccountsAction"),
      },
      {
        id: "signature",
        icon: "✒️",
        title: t("helpTopicSignatureTitle"),
        description: t("helpTopicSignatureDesc"),
        settingView: "signature",
        actionLabel: t("helpTopicSignatureAction"),
      },
      {
        id: "rules",
        icon: "⚡",
        title: t("helpTopicRulesTitle"),
        description: t("helpTopicRulesDesc"),
        settingView: "rules",
        actionLabel: t("helpTopicRulesAction"),
      },
      {
        id: "autoreply",
        icon: "↩️",
        title: t("helpTopicAutoreplyTitle"),
        description: t("helpTopicAutoreplyDesc"),
        settingView: "autoReply",
        actionLabel: t("helpTopicAutoreplyAction"),
      },
      {
        id: "notify",
        icon: "🔔",
        title: t("helpTopicNotifyTitle"),
        description: t("helpTopicNotifyDesc"),
        settingView: "notifications",
        actionLabel: t("helpTopicNotifyAction"),
      },
      {
        id: "imap",
        icon: "📬",
        title: t("helpTopicImapTitle"),
        description: t("helpTopicImapDesc"),
        settingView: "imap",
        guideHref: "/help/imap",
        actionLabel: t("helpTopicImapAction"),
      },
      {
        id: "deliverability",
        icon: "📈",
        title: t("helpTopicDeliverTitle"),
        description: t("helpTopicDeliverDesc"),
        settingView: "deliverability",
        actionLabel: t("helpTopicDeliverAction"),
      },
      {
        id: "calendar",
        icon: "📅",
        title: t("helpTopicCalendarTitle"),
        description: t("helpTopicCalendarDesc"),
        actionLabel: t("helpTopicCalendarAction"),
        onAction: onOpenCalendar,
      },
      {
        id: "contacts",
        icon: "👥",
        title: t("helpTopicContactsTitle"),
        description: t("helpTopicContactsDesc"),
        actionLabel: t("helpTopicContactsAction"),
        onAction: onOpenContacts,
      },
      {
        id: "security",
        icon: "🔒",
        title: t("helpTopicSecurityTitle"),
        description: t("helpTopicSecurityDesc"),
        settingView: "security",
        actionLabel: t("helpTopicSecurityAction"),
      },
      {
        id: "integrations",
        icon: "🔗",
        title: t("helpTopicIntegrationsTitle"),
        description: t("helpTopicIntegrationsDesc"),
        settingView: "integrations",
        actionLabel: t("helpTopicIntegrationsAction"),
      },
      {
        id: "feedback",
        icon: "💬",
        title: t("helpTopicFeedbackTitle"),
        description: t("helpTopicFeedbackDesc"),
        actionLabel: t("helpTopicFeedbackAction"),
        onAction: () => {
          window.location.href =
            "mailto:destek@lerta.com.tr?subject=Lerta%20Posta%20geri%20bildirim";
        },
      },
      {
        id: "privacy",
        icon: "🛡️",
        title: t("helpTopicPrivacyTitle"),
        description: t("helpTopicPrivacyDesc"),
        settingView: "privacy",
        actionLabel: t("helpTopicPrivacyAction"),
      },
      {
        id: "ops",
        icon: "📋",
        title: t("helpTopicOpsTitle"),
        description: t("helpTopicOpsDesc"),
        settingView: "ops",
        actionLabel: t("helpTopicOpsAction"),
      },
    ],
    [t, onOpenCalendar, onOpenContacts],
  );

  return (
    <div className="mail-help-panel mail-help-panel--premium">
      <p className="mail-posta-intro">{t("helpIntro")}</p>

      <section className="mail-posta-card mail-help-quick-card">
        <header className="mail-posta-card-head">
          <h3 className="mail-posta-card-title">{t("helpQuickTitle")}</h3>
          <p className="mail-posta-card-desc">{t("helpQuickDesc")}</p>
        </header>
        <div className="mail-help-quick-grid">
          <button
            type="button"
            className="mail-help-quick-btn"
            onClick={() => onOpenSetting("imap")}
          >
            <span aria-hidden="true">📬</span>
            {t("helpQuickImap")}
          </button>
          <button
            type="button"
            className="mail-help-quick-btn"
            onClick={() => onOpenSetting("notifications")}
          >
            <span aria-hidden="true">🔔</span>
            {t("helpQuickNotify")}
          </button>
          <button
            type="button"
            className="mail-help-quick-btn"
            onClick={() => window.open("/help/imap", "_blank", "noopener,noreferrer")}
          >
            <span aria-hidden="true">📖</span>
            {t("helpQuickImapGuide")}
          </button>
        </div>
      </section>

      <ul className="mail-help-topic-list">
        {topics.map((topic) => (
          <li key={topic.id} className="mail-posta-card mail-help-topic-card">
            <div className="mail-help-topic-icon" aria-hidden="true">{topic.icon}</div>
            <div className="mail-help-topic-body">
              <h3 className="mail-help-topic-title">{topic.title}</h3>
              <p className="mail-help-topic-desc">{topic.description}</p>
              <div className="mail-help-topic-actions">
                {topic.settingView ? (
                  <button
                    type="button"
                    className="mail-premium-btn mail-premium-btn--primary"
                    onClick={() => onOpenSetting(topic.settingView!)}
                  >
                    {topic.actionLabel ?? t("helpGoSettings")}
                  </button>
                ) : null}
                {topic.onAction ? (
                  <button
                    type="button"
                    className="mail-premium-btn mail-premium-btn--primary"
                    onClick={() => topic.onAction?.()}
                  >
                    {topic.actionLabel ?? t("helpOpen")}
                  </button>
                ) : null}
                {topic.guideHref ? (
                  <a
                    className="mail-premium-btn mail-premium-btn--ghost"
                    href={topic.guideHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("helpFullGuide")}
                  </a>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <section className="mail-posta-card mail-posta-card--muted mail-help-footer-card">
        <p className="mail-help-footer-text">
          {t("helpFooterSite")}{" "}
          <a href="https://posta.lerta.com.tr/mail" target="_blank" rel="noreferrer">
            posta.lerta.com.tr
          </a>
          {t("helpFooterSupport")}
        </p>
      </section>
    </div>
  );
}
