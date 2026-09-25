import { MarketingPageShell } from "@/components/MarketingPageShell";

export default function KvkkPage() {
  return (
    <MarketingPageShell narrow>
      <h1>KVKK Aydınlatma Metni (özet)</h1>
      <p>
        Lerta Mail hizmeti kapsamında işlenen veriler; hesap bilgileri, e-posta
        meta verileri ve faturalama kayıtlarıdır. Veriler Türkiye&apos;deki
        sunucularda saklanır; üçüncü taraflarla yalnızca hizmetin ifası için
        (ödeme kuruluşu, altyapı) paylaşılır.
      </p>
      <p>
        Haklarınız (erişim, düzeltme, silme) için{" "}
        <a href="mailto:destek@lerta.com.tr">destek@lerta.com.tr</a>.
      </p>
      <p style={{ color: "var(--muted)", fontSize: 14 }}>
        Bu sayfa bilgilendirme amaçlıdır; hukuki metinler yayın öncesi
        güncellenecektir.
      </p>
    </MarketingPageShell>
  );
}
