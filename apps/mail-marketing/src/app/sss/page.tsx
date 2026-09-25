import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import { MARKETING_FAQ } from "@/lib/marketingFaq";
import { CORPORATE_REGISTER, PILOT_REGISTER } from "@/lib/marketingUrls";

export const metadata: Metadata = {
  title: "SSS — Lerta Mail",
  description:
    "Lerta Mail kurumsal e-posta: domain, DNS, ödeme, Enterprise ve destek sık sorulan sorular.",
};

export default function SssPage() {
  return (
    <MarketingPageShell narrow>
      <h1>Sık sorulan sorular</h1>
      <p className="pricing-lead">
        Kurumsal posta, faturalama ve güvenlik hakkında özet cevaplar. Hukuki
        detay için <a href="/kvkk">KVKK</a> ve <a href="/sla">SLA</a> sayfalarına
        bakın.
      </p>
      <div className="faq-list">
        {MARKETING_FAQ.map((item) => (
          <details key={item.q} className="faq-item">
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
      <p className="pricing-lead">
        <a className="btn btn-primary" href={CORPORATE_REGISTER}>
          Kurumsal kayıt
        </a>
        <a className="btn btn-ghost" href={PILOT_REGISTER} style={{ marginLeft: 12 }}>
          Pilot kayıt
        </a>
      </p>
    </MarketingPageShell>
  );
}
