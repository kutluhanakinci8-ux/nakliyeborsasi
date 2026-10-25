"use client";

import Link from "next/link";
import { useMailLocale } from "@/lib/MailLocaleProvider";

type Provider = "google" | "graph";

type Props = {
  provider: Provider;
};

export function MailCalendarOAuthSetupCard({ provider }: Props) {
  const { t } = useMailLocale();
  const titleKey =
    provider === "google" ? "calGoogleSetupTitle" : "calGraphSetupTitle";
  const bodyKey =
    provider === "google" ? "calGoogleSetupBody" : "calGraphSetupBody";
  const envKey =
    provider === "google" ? "calGoogleSetupEnv" : "calGraphSetupEnv";
  const helpHref =
    provider === "google" ? "/help/google-calendar" : "/help/imap";

  return (
    <div className="mail-cal-oauth-setup" role="note">
      <p className="mail-cal-oauth-setup-title">{t(titleKey)}</p>
      <p className="mail-cal-oauth-setup-body">{t(bodyKey)}</p>
      <p className="mail-cal-oauth-setup-env">
        <code>{t(envKey)}</code>
      </p>
      <p className="mail-cal-oauth-setup-links">
        <Link href={helpHref}>{t("calSetupHelpLink")}</Link>
        {" · "}
        <a href="mailto:info@lerta.com.tr">{t("calSetupAdminLink")}</a>
      </p>
    </div>
  );
}
