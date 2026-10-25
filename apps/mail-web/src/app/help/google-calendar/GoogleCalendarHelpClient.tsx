"use client";

import Link from "next/link";
import { useMailLocale } from "@/lib/MailLocaleProvider";

export function GoogleCalendarHelpClient() {
  const { t } = useMailLocale();

  return (
    <main className="mail-help-page mail-help-page--premium">
      <p className="mail-help-back">
        <Link href="/mail">{t("helpBackWebmail")}</Link>
      </p>
      <header className="mail-help-hero">
        <h1>{t("helpGoogleTitle")}</h1>
        <p className="mail-help-hero-lead">{t("helpGoogleLead")}</p>
      </header>
      <section className="mail-help-section">
        <h2>{t("helpGoogleAdminTitle")}</h2>
        <ul>
          <li>
            <code>GOOGLE_CALENDAR_CLIENT_ID</code>
          </li>
          <li>
            <code>GOOGLE_CALENDAR_CLIENT_SECRET</code>
          </li>
          <li>
            <code>GOOGLE_CALENDAR_REDIRECT_URI</code> →{" "}
            <code>https://posta.lerta.com.tr/mail/google-calendar-oauth</code>
          </li>
        </ul>
        <p>
          {t("helpGoogleAdminConsole")}{" "}
          <code>https://www.googleapis.com/auth/calendar</code>.
        </p>
      </section>
      <section className="mail-help-section">
        <h2>{t("helpGoogleUserTitle")}</h2>
        <ol>
          <li>{t("helpGoogleUser1")}</li>
          <li>{t("helpGoogleUser2")}</li>
          <li>{t("helpGoogleUser3")}</li>
        </ol>
      </section>
      <p className="mail-help-muted">{t("helpGoogleFooter")}</p>
    </main>
  );
}
