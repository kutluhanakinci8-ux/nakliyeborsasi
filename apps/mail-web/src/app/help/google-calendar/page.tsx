import { MailLocaleProvider } from "@/lib/MailLocaleProvider";
import { GoogleCalendarHelpClient } from "./GoogleCalendarHelpClient";

export const metadata = {
  title: "Yardım — Google Takvim | Lerta Posta",
  description: "Google Calendar OAuth ve iki yön senkron kurulumu",
};

export default function GoogleCalendarHelpPage() {
  return (
    <MailLocaleProvider>
      <GoogleCalendarHelpClient />
    </MailLocaleProvider>
  );
}
