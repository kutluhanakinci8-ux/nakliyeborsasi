import type { Metadata } from "next";
import { MailLocaleProvider } from "@/lib/MailLocaleProvider";
import { readMailUiLocale, t } from "@/lib/mailLocale";
import { ImapHelpClient } from "./ImapHelpClient";

export function generateMetadata(): Metadata {
  const locale = readMailUiLocale();
  return {
    title: t("helpImapMetaTitle", locale),
    description: t("helpImapMetaDesc", locale),
  };
}

export default function ImapHelpPage() {
  return (
    <MailLocaleProvider>
      <ImapHelpClient />
    </MailLocaleProvider>
  );
}
