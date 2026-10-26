"use client";

import { useMailLocale } from "@/lib/MailLocaleProvider";

/** Placeholder hub detail — app catalog content will ship later. */
export function MailExploreLertaAppsPanel() {
  const { t } = useMailLocale();
  return (
    <div
      className="mail-explore-lerta-apps"
      aria-label={t("exploreLertaAppsTitle")}
    />
  );
}
