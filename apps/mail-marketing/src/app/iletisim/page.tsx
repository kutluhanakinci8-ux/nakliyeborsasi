import Link from "next/link";

const consoleUrl =
  process.env.NEXT_PUBLIC_CONSOLE_URL ?? "https://yonetim.lerta.com.tr";

export default function ContactPage() {
  return (
    <div className="landing legal-page">
      <div className="wrap">
        <p>
          <Link href="/">← Lerta Mail</Link>
        </p>
        <h1>İletişim</h1>
        <ul>
          <li>
            E-posta:{" "}
            <a href="mailto:destek@lerta.com.tr">destek@lerta.com.tr</a>
          </li>
          <li>
            Yönetim konsolu:{" "}
            <a href={consoleUrl}>{consoleUrl.replace(/^https?:\/\//, "")}</a>
          </li>
          <li>Webmail: posta.lerta.com.tr</li>
        </ul>
        <p style={{ color: "var(--muted)" }}>
          Kurumsal satış ve teknik destek için yanıt süresi hedefi: iş günü 24
          saat.
        </p>
      </div>
    </div>
  );
}
