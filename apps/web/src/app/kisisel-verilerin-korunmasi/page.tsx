import { CorporatePageLayout } from "../../components/CorporatePageLayout";

export default function KisiselVerilerPage() {
  return (
    <CorporatePageLayout
      eyebrow="Yasal"
      title="Kişisel Verilerin Korunması"
      lead="6698 sayılı KVKK kapsamında kişisel verilerinizin işlenmesi, saklanması ve haklarınıza ilişkin özet bilgilendirme metni (demo)."
    >
      <div className="corporate-prose module-panel">
        <p>
          Lerta Logistics demo platformunda toplanan e-posta, firma kimliği ve işlem kayıtları yalnızca
          hizmet sunumu ve güvenlik amacıyla işlenir. Canlı ortamda güncel aydınlatma metni burada
          yayımlanacaktır.
        </p>
      </div>
    </CorporatePageLayout>
  );
}
