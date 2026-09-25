import Link from "next/link";
import {
  CONSOLE_URL,
  CORPORATE_REGISTER,
  MAIL_WEB_URL,
} from "@/lib/marketingUrls";

export function MarketingSiteHeader() {
  const loginHref = `${MAIL_WEB_URL.replace(/\/$/, "")}/login`;
  const consoleLoginHref = `${CONSOLE_URL.replace(/\/$/, "")}/login`;

  return (
    <header>
      <Link href="/" className="brand" aria-label="Lerta Mail ana sayfa">
        <span className="brand-mark" aria-hidden="true">@</span>
        <span>Lerta Mail</span>
      </Link>
      <nav className="nav-links">
        <a className="btn btn-ghost" href="/#fiyatlar">Fiyatlar</a>
        <a className="btn btn-ghost" href="/sss">SSS</a>
        <a className="btn btn-ghost" href={loginHref}>Webmail</a>
        <a className="btn btn-ghost" href={consoleLoginHref}>Yönetim</a>
        <a className="btn btn-primary" href={CORPORATE_REGISTER}>
          Domain ile başla
        </a>
      </nav>
    </header>
  );
}
