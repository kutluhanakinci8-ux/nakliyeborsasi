"use client";

import Link from "next/link";
import { useMailLocale } from "@/lib/MailLocaleProvider";

export function ImapHelpClient() {
  const { t } = useMailLocale();

  return (
    <main className="mail-help-page mail-help-page--premium">
      <p className="mail-help-back">
        <Link href="/mail">{t("helpBackWebmail")}</Link>
      </p>
      <header className="mail-help-hero">
        <h1>{t("helpImapTitle")}</h1>
        <p className="mail-help-hero-lead">{t("helpImapLead")}</p>
      </header>

      <section className="mail-help-card">
        <h2>{t("helpImapStep1Title")}</h2>
        <ol className="mail-help-steps">
          <li>
            {t("helpImapStep1aBefore")}{" "}
            <strong>{t("helpImapStep1aMenu")}</strong> {t("helpImapStep1aAfter")}
          </li>
          <li>
            <strong>{t("helpImapStep1bStrong")}</strong> {t("helpImapStep1bRest")}
          </li>
          <li>
            {t("helpImapStep1cBefore")}{" "}
            <strong>{t("helpImapStep1cStrong")}</strong> {t("helpImapStep1cAfter")}
          </li>
        </ol>
      </section>

      <section className="mail-help-card">
        <h2>{t("helpImapServerTitle")}</h2>
        <ul className="mail-help-list">
          <li>
            <strong>{t("helpImapServerInLabel")}</strong> {t("helpImapServerInBody")}
          </li>
          <li>
            <strong>{t("helpImapServerUserLabel")}</strong> {t("helpImapServerUserBody")}
          </li>
          <li>
            <strong>{t("helpImapServerPassLabel")}</strong> {t("helpImapServerPassBody")}
          </li>
        </ul>
      </section>

      <section className="mail-help-card">
        <h2>{t("helpImapSmtpTitle")}</h2>
        <ul className="mail-help-list">
          <li>
            <strong>{t("helpImapSmtpOutLabel")}</strong> {t("helpImapSmtpOutBody")}
          </li>
          <li>{t("helpImapSmtpAuth")}</li>
          <li>{t("helpImapSmtpErr")}</li>
        </ul>
      </section>

      <section id="outlook-mobile" className="mail-help-card">
        <h2>{t("helpImapOutlookMobileTitle")}</h2>
        <ol className="mail-help-steps">
          <li>{t("helpImapOutlookMobile1")}</li>
          <li>{t("helpImapOutlookMobile2")}</li>
          <li>{t("helpImapOutlookMobile3")}</li>
          <li>{t("helpImapOutlookMobile4")}</li>
          <li>{t("helpImapOutlookMobile5")}</li>
          <li>
            {t("helpImapOutlookMobile6a")}{" "}
            {t("helpImapOutlookMobile6b")}{" "}
            <Link href="/mail">webmail</Link> {t("helpImapOutlookMobile6c")}
          </li>
        </ol>
      </section>

      <section className="mail-help-card">
        <h2>{t("helpImapOutlookDesktopTitle")}</h2>
        <ol className="mail-help-steps">
          <li>{t("helpImapOutlookDesktop1")}</li>
          <li>{t("helpImapOutlookDesktop2")}</li>
        </ol>
      </section>

      <section className="mail-help-card">
        <h2>{t("helpImapThunderbirdTitle")}</h2>
        <ol className="mail-help-steps">
          <li>{t("helpImapThunderbird1")}</li>
          <li>{t("helpImapThunderbird2")}</li>
          <li>{t("helpImapThunderbird3")}</li>
        </ol>
      </section>

      <section className="mail-help-card">
        <h2>{t("helpImapWebmailTitle")}</h2>
        <p>{t("helpImapWebmailBody")}</p>
      </section>

      <section className="mail-help-card">
        <h2>{t("helpImapSecurityTitle")}</h2>
        <ul className="mail-help-list">
          <li>{t("helpImapSecurity1")}</li>
          <li>
            {t("helpImapSecurity2Before")}{" "}
            <code>https://posta.lerta.com.tr</code> {t("helpImapSecurity2After")}
          </li>
        </ul>
      </section>

      <section className="mail-help-card">
        <h2>{t("helpImapPwaTitle")}</h2>
        <p>{t("helpImapPwaBody")}</p>
      </section>

      <p className="mail-help-muted">
        {t("helpImapOperatorFooter")}{" "}
        <code>docs/MAIL_THUNDERBIRD_IMAP.md</code>
      </p>
    </main>
  );
}
