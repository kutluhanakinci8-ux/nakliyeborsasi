import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import { LEGAL_DISCLAIMER, SUPPORT_EMAIL } from "@/lib/marketingSite";

export const metadata: Metadata = {
  title: "SLA — Lerta Mail",
  description:
    "Lerta Mail hizmet düzeyi hedefleri: kullanılabilirlik, posta teslimi ve destek yanıt süreleri.",
};

export default function SlaPage() {
  return (
    <MarketingPageShell narrow>
      <h1>Hizmet düzeyi (SLA) — özet</h1>
      <p>
        Lerta Mail kurumsal posta hizmeti için hedeflenen kullanılabilirlik ve
        destek süreleri. Kesin taahhütler kurumsal müşteri sözleşmesinde yer
        alır; bu sayfa ön bilgilendirme amaçlıdır.
      </p>
      <table className="sla-table">
        <thead>
          <tr>
            <th>Konu</th>
            <th>Hedef</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>API ve webmail erişimi</td>
            <td>%99,5 aylık (planlı bakım hariç)</td>
          </tr>
          <tr>
            <td>Gelen posta (MX)</td>
            <td>7/24 kabul; gecikme genelde &lt; 5 dk</td>
          </tr>
          <tr>
            <td>Giden posta kuyruğu</td>
            <td>Normal yük altında dakikalar içinde işleme</td>
          </tr>
          <tr>
            <td>Destek (e-posta)</td>
            <td>İş günü 24 saat içinde ilk yanıt</td>
          </tr>
          <tr>
            <td>Enterprise öncelikli destek</td>
            <td>İş günü 8 saat içinde ilk yanıt (sözleşmeye bağlı)</td>
          </tr>
          <tr>
            <td>Planlı bakım</td>
            <td>Önceden duyuru; gece penceresi tercih</td>
          </tr>
        </tbody>
      </table>
      <p style={{ color: "var(--muted)", fontSize: 14 }}>
        Canlı durum: <a href="/durum">/durum</a> ·{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </p>
      <p style={{ color: "var(--muted)", fontSize: 14 }}>{LEGAL_DISCLAIMER}</p>
    </MarketingPageShell>
  );
}
