import { MarketingPageShell } from "@/components/MarketingPageShell";

export default function SlaPage() {
  return (
    <MarketingPageShell narrow>
      <h1>Hizmet düzeyi (SLA) — özet</h1>
      <p>
        Lerta Mail kurumsal posta hizmeti için hedeflenen kullanılabilirlik ve
        destek süreleri. Kesin sözleşme metni kurumsal müşteri sözleşmesinde
        yer alır; bu sayfa ön bilgilendirme amaçlıdır.
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
            <td>Destek (e-posta)</td>
            <td>İş günü 24 saat içinde ilk yanıt</td>
          </tr>
          <tr>
            <td>Planlı bakım</td>
            <td>Önceden duyuru; gece penceresi tercih</td>
          </tr>
        </tbody>
      </table>
      <p style={{ color: "var(--muted)", fontSize: 14 }}>
        Durum ve kesintiler: destek@lerta.com.tr · İleride status sayfası
        eklenecek.
      </p>
    </MarketingPageShell>
  );
}
