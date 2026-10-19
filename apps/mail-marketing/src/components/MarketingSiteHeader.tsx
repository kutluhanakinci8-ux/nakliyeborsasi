import Link from "next/link";
import {
  CONSOLE_URL,
  CORPORATE_REGISTER,
  MAIL_WEB_URL,
  U88_APP_URL,
} from "@/lib/marketingUrls";

export function MarketingSiteHeader() {
  const loginHref = `${MAIL_WEB_URL.replace(/\/$/, "")}/login`;
  const consoleLoginHref = `${CONSOLE_URL.replace(/\/$/, "")}/login`;

  return (
    <header>
      <Link href="/" className="brand" aria-label="Lerta ana sayfa">
        <span className="brand-mark" aria-hidden="true">L</span>
        <span>Lerta</span>
      </Link>
      <nav className="nav-links">
        <Link className="btn btn-ghost" href="/u88">U88</Link>
        <Link className="btn btn-ghost" href="/posta">Posta</Link>
        <Link className="btn btn-ghost" href="/mesaj">Mesaj</Link>
        <a className="btn btn-ghost" href="/posta#fiyatlar">Fiyatlar</a>
        <a className="btn btn-ghost" href="/durum">Durum</a>
        <a className="btn btn-ghost" href={U88_APP_URL}>U88 giriş</a>
        <a className="btn btn-ghost" href={loginHref}>Webmail</a>
        <a className="btn btn-ghost" href={consoleLoginHref}>Yönetim</a>
        <a className="btn btn-primary" href={CORPORATE_REGISTER}>
          Kurumsal kayıt
        </a>
      </nav>
    </header>
  );
}
