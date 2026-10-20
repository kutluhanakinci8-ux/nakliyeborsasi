import {
  CORPORATE_REGISTER,
  MAIL_WEB_URL,
  PILOT_REGISTER,
} from "@/lib/marketingUrls";

export function MarketingSiteFooter() {
  return (
    <footer className="site-footer">
      <span>
        © {new Date().getFullYear()} Lerta · Posta, Mesajlaşma ve KVKK — Türkiye&apos;de
        barındırılan kurumsal platform
      </span>
      <nav className="footer-links">
        <a href="/posta">Posta</a>
        <a href={`${MAIL_WEB_URL.replace(/\/$/, "")}/login`}>Webmail giriş</a>
        <a href="/mesaj">Mesajlaşma</a>
        <a href="/u88">KVKK</a>
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
