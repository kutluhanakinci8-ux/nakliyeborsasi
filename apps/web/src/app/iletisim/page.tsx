import { CorporatePageLayout } from "../../components/CorporatePageLayout";
import { IletisimFormClient } from "./IletisimFormClient";

export default function IletisimPage() {
  return (
    <CorporatePageLayout
      eyebrow="İletişim"
      title="Bize ulaşın"
      lead="Basın, iş ortaklığı, kariyer veya demo talepleri için formu doldurun. Demo ortamında mesajlar e-posta göndermez — kayıt simülasyonudur."
    >
      <IletisimFormClient />
    </CorporatePageLayout>
  );
}
