import Link from "next/link";
import {
  FOOTER_LEGAL_LINKS,
  FOOTER_LEGAL_NOTE,
  FOOTER_LOCALE_LABEL,
} from "@/lib/marketingLegalFooter";

export function MarketingFooterLegalBar() {
  const year = new Date().getFullYear();

  return (
    <div className="site-footer__legal" aria-label="Yasal bilgiler">
      <p className="site-footer__locale">
        <span className="site-footer__locale-icon" aria-hidden>
          ⌂
        </span>
        {FOOTER_LOCALE_LABEL}
      </p>
      <nav className="site-footer__legal-nav" aria-label="Yasal bağlantılar">
        <ul className="site-footer__legal-links">
          {FOOTER_LEGAL_LINKS.map((item) => (
            <li key={`${item.href}-${item.label}`}>
              <Link href={item.href}>{item.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
      <p className="site-footer__legal-copy">
        © {year} Lerta · Posta ve Mesajlaşma
      </p>
      <p className="site-footer__legal-note">{FOOTER_LEGAL_NOTE}</p>
    </div>
  );
}
