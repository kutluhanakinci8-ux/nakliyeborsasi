"use client";

import { useCallback, useMemo, useState } from "react";
import type { SettingsView } from "./MailSettingsPanel";
import { useMailLocale } from "@/lib/MailLocaleProvider";
import { mailVitrinUrl, MAIL_VITRIN_PATHS } from "@/lib/mailVitrinLinks";
import { isStandaloneMailPwa } from "@/lib/mailIosPwa";
import {
  buildMailClientDiagnostics,
  downloadDiagnosticsJson,
  resetMailLocalTroubleshootingCaches,
} from "@/lib/mailHelpLocalReset";

type Props = {
  onOpenSetting: (view: SettingsView) => void;
  onOpenCalendar?: () => void;
  onOpenContacts?: () => void;
};

type HelpSubView = "main" | "diagnostics" | "thirdParty";

type RowProps = {
  label: string;
  onClick: () => void;
  external?: boolean;
  chevron?: boolean;
  value?: string;
};

function HelpIosRow({ label, onClick, external, chevron, value }: RowProps) {
  return (
    <li>
      <button type="button" className="mail-help-ios-row" onClick={onClick}>
        <span className="mail-help-ios-row-label">{label}</span>
        {value ? <span className="mail-help-ios-row-value">{value}</span> : null}
        {external ? (
          <span className="mail-help-ios-row-accessory" aria-hidden="true">↗</span>
        ) : chevron ? (
          <span className="mail-help-ios-row-accessory" aria-hidden="true">›</span>
        ) : null}
      </button>
    </li>
  );
}

const SUPPORT_EMAIL = "destek@lerta.com.tr";

export function MailHelpPanel({
  onOpenSetting,
}: Props) {
  const { t } = useMailLocale();
  const [subView, setSubView] = useState<HelpSubView>("main");
  const [status, setStatus] = useState("");

  const deployVersion =
    process.env.NEXT_PUBLIC_DEPLOY_SHA?.trim().slice(0, 7) || "—";

  const diagnostics = useMemo(
    () => buildMailClientDiagnostics(),
    [subView],
  );

  const openSupport = useCallback(() => {
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      t("helpMailSubjectSupport"),
    )}`;
  }, [t]);

  const openFeedback = useCallback(() => {
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      t("helpMailSubjectFeedback"),
    )}&body=${encodeURIComponent(t("helpMailBodyFeedback"))}`;
  }, [t]);

  const testPush = useCallback(() => {
    if (typeof Notification === "undefined") {
      setStatus(t("helpPushUnsupported"));
      return;
    }
    if (Notification.permission === "granted") {
      try {
        const title = t("helpPushTestTitle");
        const body = t("helpPushTestBody");
        if (isStandaloneMailPwa() && "serviceWorker" in navigator) {
          void navigator.serviceWorker.ready.then((reg) => {
            void reg.showNotification(title, { body, tag: "lerta-posta-push-test" });
          });
        } else {
          new Notification(title, { body });
        }
        setStatus(t("helpPushTestSent"));
      } catch {
        setStatus(t("helpPushTestFailed"));
      }
      return;
    }
    onOpenSetting("notifications");
    setStatus(t("helpPushOpenSettings"));
  }, [onOpenSetting, t]);

  const resetSearchCache = useCallback(() => {
    if (!window.confirm(t("helpResetSearchConfirm"))) {
      return;
    }
    void resetMailLocalTroubleshootingCaches().then(() => {
      setStatus(t("helpResetSearchDone"));
    });
  }, [t]);

  const clearLocalContacts = useCallback(() => {
    if (!window.confirm(t("helpClearLocalConfirm"))) {
      return;
    }
    void resetMailLocalTroubleshootingCaches().then(() => {
      setStatus(t("helpClearLocalDone"));
    });
  }, [t]);

  const copyDiagnostics = useCallback(async () => {
    const text = JSON.stringify(diagnostics, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setStatus(t("helpDiagnosticsCopied"));
    } catch {
      downloadDiagnosticsJson(diagnostics);
      setStatus(t("helpDiagnosticsDownloaded"));
    }
  }, [diagnostics, t]);

  if (subView === "diagnostics") {
    return (
      <div className="mail-help-panel mail-help-panel--ios">
        <div className="mail-help-ios-subhead">
          <button
            type="button"
            className="mail-help-ios-back"
            onClick={() => setSubView("main")}
          >
            {t("actionBack")}
          </button>
          <h3>{t("helpDiagnosticsTitle")}</h3>
        </div>
        <p className="mail-help-ios-lead">{t("helpDiagnosticsIntro")}</p>
        <pre className="mail-help-diagnostics-pre">
          {JSON.stringify(diagnostics, null, 2)}
        </pre>
        <div className="mail-help-ios-actions">
          <button
            type="button"
            className="mail-premium-btn mail-premium-btn--primary"
            onClick={() => void copyDiagnostics()}
          >
            {t("helpDiagnosticsCopy")}
          </button>
          <button
            type="button"
            className="mail-premium-btn mail-premium-btn--ghost"
            onClick={() => downloadDiagnosticsJson(diagnostics)}
          >
            {t("helpDiagnosticsDownload")}
          </button>
        </div>
        {status ? <p className="mail-settings-muted" role="status">{status}</p> : null}
      </div>
    );
  }

  if (subView === "thirdParty") {
    return (
      <div className="mail-help-panel mail-help-panel--ios">
        <div className="mail-help-ios-subhead">
          <button
            type="button"
            className="mail-help-ios-back"
            onClick={() => setSubView("main")}
          >
            {t("actionBack")}
          </button>
          <h3>{t("helpThirdPartyTitle")}</h3>
        </div>
        <p className="mail-help-ios-lead">{t("helpThirdPartyIntro")}</p>
        <ul className="mail-help-ios-bullets">
          <li>{t("helpThirdPartyItem1")}</li>
          <li>{t("helpThirdPartyItem2")}</li>
          <li>{t("helpThirdPartyItem3")}</li>
        </ul>
        <p className="mail-help-ios-lead">
          <a
            href={mailVitrinUrl(MAIL_VITRIN_PATHS.u88)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("helpThirdPartyMore")}
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="mail-help-panel mail-help-panel--ios">
      {status ? (
        <p className="mail-help-ios-status" role="status">{status}</p>
      ) : null}

      <section className="mail-help-ios-section" aria-label={t("helpSectionSupport")}>
        <ul className="mail-help-ios-group">
          <HelpIosRow label={t("helpContactSupport")} onClick={openSupport} />
          <HelpIosRow label={t("helpSendFeedback")} onClick={openFeedback} />
          <HelpIosRow
            label={t("helpFaq")}
            external
            onClick={() =>
              window.open(mailVitrinUrl(MAIL_VITRIN_PATHS.sss), "_blank", "noopener,noreferrer")
            }
          />
        </ul>
      </section>

      <section className="mail-help-ios-section">
        <h4 className="mail-help-ios-section-title">{t("helpSectionTroubleshoot")}</h4>
        <ul className="mail-help-ios-group">
          <HelpIosRow label={t("helpTestPush")} onClick={testPush} />
          <HelpIosRow label={t("helpResetSearchIndex")} onClick={resetSearchCache} />
          <HelpIosRow label={t("helpClearLocalContacts")} onClick={clearLocalContacts} />
          <HelpIosRow
            label={t("helpDiagnostics")}
            chevron
            onClick={() => {
              setStatus("");
              setSubView("diagnostics");
            }}
          />
        </ul>
      </section>

      <section className="mail-help-ios-section">
        <h4 className="mail-help-ios-section-title">{t("helpSectionAbout")}</h4>
        <ul className="mail-help-ios-group">
          <HelpIosRow
            label={t("helpPrivacyCookies")}
            external
            onClick={() =>
              window.open(mailVitrinUrl(MAIL_VITRIN_PATHS.kvkk), "_blank", "noopener,noreferrer")
            }
          />
          <HelpIosRow
            label={t("helpThirdParty")}
            chevron
            onClick={() => setSubView("thirdParty")}
          />
          <HelpIosRow
            label={t("helpLicense")}
            external
            onClick={() =>
              window.open(
                mailVitrinUrl(MAIL_VITRIN_PATHS.kurumsal),
                "_blank",
                "noopener,noreferrer",
              )
            }
          />
          <li className="mail-help-ios-row mail-help-ios-row--static">
            <span className="mail-help-ios-row-label">{t("helpVersion")}</span>
            <span className="mail-help-ios-row-value">{deployVersion}</span>
          </li>
        </ul>
        <p className="mail-help-ios-footnote">{t("helpAboutFootnote")}</p>
      </section>
    </div>
  );
}
