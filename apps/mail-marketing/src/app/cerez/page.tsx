import {
  MarketingLegalPage,
  legalMetadata,
} from "@/components/MarketingLegalPage";

export const metadata = legalMetadata(
  "Çerez politikası — Lerta",
  "Lerta vitrin ve web uygulamalarında tanımlama bilgileri (özet).",
);

export default function CookiePage() {
  return (
    <MarketingLegalPage
      title="Çerez"
      description=""
      heading="Tanımlama bilgileri (çerez) — özet"
    >
      <p>
        Oturum, güvenlik ve tercih çerezleri hizmetin çalışması için kullanılır.
        Zorunlu çerezler devre dışı bırakılamaz.
      </p>
      <h2>Tercihleriniz</h2>
      <p>
        Analitik ve pazarlama çerezleri (varsa) için{" "}
        <a href="/gizlilik-tercihleri">gizlilik tercihleri</a> sayfasından
        yönetim sunulacaktır. AB/UK müşterileri için GDPR uyumlu banner
        genişlemeyle birlikte etkinleştirilecektir.
      </p>
    </MarketingLegalPage>
  );
}
