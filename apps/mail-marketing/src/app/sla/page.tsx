import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import { LEGAL_DISCLAIMER, SUPPORT_EMAIL } from "@/lib/marketingSite";

export const metadata: Metadata = {
  title: "SLA — Lerta",
  description:
    "Lerta Posta ve Mesaj hizmet düzeyi hedefleri: kullanılabilirlik, teslimat ve destek yanıt süreleri.",
};

export default function SlaPage() {
  return (
    <MarketingPageShell
      narrow
      contentClassName="platform-content--product-vitrin platform-content--trust"
    >
      <nav className="breadcrumb breadcrumb--premium" aria-label="Breadcrumb">
        <Link href="/">Lerta</Link>
        <span aria-hidden="true">/</span>
        <Link href="/guven">Güven & uyum</Link>
        <span aria-hidden="true">/</span>
        <span>SLA</span>
      </nav>

      <h1 className="section-title section-title--lg">Hizmet düzeyi (SLA) — özet</h1>
      <p className="section-lead">
        Lerta Posta ve Lerta Mesaj için hedeflenen kullanılabilirlik ve destek
        süreleri. Kesin taahhütler kurumsal müşteri sözleşmesinde yer alır; bu
        sayfa ön bilgilendirme amaçlıdır.
      </p>
      <table className="sla-table">
        <thead>
          <tr>
            <th>Bileşen</th>
            <th>Hedef</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Posta — API ve webmail</td>
            <td>%99,5 aylık (planlı bakım hariç)</td>
          </tr>
          <tr>
            <td>Posta — gelen (MX)</td>
            <td>7/24 kabul; gecikme genelde &lt; 5 dk</td>
          </tr>
          <tr>
            <td>Posta — giden kuyruk</td>
            <td>Normal yük altında dakikalar içinde işleme</td>
          </tr>
          <tr>
            <td>Mesaj — sohbet ve bildirim</td>
            <td>%99,5 aylık (planlı bakım hariç)</td>
          </tr>
          <tr>
            <td>Mesaj — köprü entegrasyonları</td>
            <td>Üçüncü taraf SLA&apos;larına tabi; Lerta hedefi ayrı izlenir</td>
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
      <p className="legal-muted">
        Canlı durum: <Link href="/durum">/durum</Link> · Güven merkezi:{" "}
        <Link href="/guven">/guven</Link> ·{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </p>
      <p className="legal-muted">{LEGAL_DISCLAIMER}</p>
    </MarketingPageShell>
  );
}
