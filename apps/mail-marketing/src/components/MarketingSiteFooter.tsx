import { CORPORATE_REGISTER, PILOT_REGISTER } from "@/lib/marketingUrls";

export function MarketingSiteFooter() {
  return (
    <footer className="site-footer">
      <span>
        © {new Date().getFullYear()} Lerta Mail · Türkiye&apos;de barındırılan
        kurumsal posta
      </span>
      <nav className="footer-links">
        <a href="/sss">SSS</a>
        <a href="/sla">SLA</a>
        <a href="/durum">Durum</a>
        <a href="/kvkk">KVKK</a>
        <a href="/iletisim">İletişim</a>
        <a href={CORPORATE_REGISTER}>Kurumsal kayıt</a>
        <a href={PILOT_REGISTER}>Pilot kayıt</a>
      </nav>
    </footer>
  );
}
