import type { Metadata } from "next";
import { MailLocaleProvider } from "@/lib/MailLocaleProvider";
import { readMailUiLocale, t } from "@/lib/mailLocale";
import { GoogleCalendarHelpClient } from "./GoogleCalendarHelpClient";

export function generateMetadata(): Metadata {
  const locale = readMailUiLocale();
  return {
    title: t("helpGoogleCalMetaTitle", locale),
    description: t("helpGoogleCalMetaDesc", locale),
  };
}

export default function GoogleCalendarHelpPage() {
  return (
    <MailLocaleProvider>
      <GoogleCalendarHelpClient />
    </MailLocaleProvider>
  );
}
