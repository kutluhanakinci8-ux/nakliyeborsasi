import { MarketingPageShell } from "@/components/MarketingPageShell";
import { CONSOLE_URL } from "@/lib/marketingUrls";

export default function ContactPage() {
  return (
    <MarketingPageShell narrow>
      <h1>İletişim</h1>
      <ul>
        <li>
          E-posta:{" "}
          <a href="mailto:destek@lerta.com.tr">destek@lerta.com.tr</a>
        </li>
        <li>
          Yönetim konsolu:{" "}
          <a href={CONSOLE_URL}>{CONSOLE_URL.replace(/^https?:\/\//, "")}</a>
        </li>
        <li>Webmail: posta.lerta.com.tr</li>
      </ul>
      <p style={{ color: "var(--muted)" }}>
        Kurumsal satış ve teknik destek için yanıt süresi hedefi: iş günü 24
        saat.
      </p>
    </MarketingPageShell>
  );
}
