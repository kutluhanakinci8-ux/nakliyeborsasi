import { MailLocaleProvider } from "@/lib/MailLocaleProvider";
import { ImapHelpClient } from "./ImapHelpClient";

export const metadata = {
  title: "Yardım — IMAP / SMTP | Lerta Posta",
  description: "Harici e-posta istemcisi kurulum rehberi",
};

export default function ImapHelpPage() {
  return (
    <MailLocaleProvider>
      <ImapHelpClient />
    </MailLocaleProvider>
  );
}
