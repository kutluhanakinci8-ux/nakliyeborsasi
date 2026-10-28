import {
  MarketingLegalPage,
  legalMetadata,
} from "@/components/MarketingLegalPage";

export const metadata = legalMetadata(
  "Gizlilik tercihleri — Lerta",
  "Lerta hizmetlerinde gizlilik ve izleme tercihleri.",
);

export default function PrivacyPreferencesPage() {
  return (
    <MarketingLegalPage
      title="Gizlilik tercihleri"
      description=""
      heading="Gizlilik tercihleriniz"
    >
      <p>
        Kurumsal posta hesabınız için veri işleme tercihleri yönetim konsolundan
        yapılır. Vitrin sitesinde isteğe bağlı analitik çerez tercihi burada
        toplanacaktır.
      </p>
      <p>
        Şu an yalnızca zorunlu çerezler kullanılmaktadır. Tercih merkezi çok
        ülkeli yaygınlaşma ile birlikte güncellenecektir.
      </p>
    </MarketingLegalPage>
  );
}
