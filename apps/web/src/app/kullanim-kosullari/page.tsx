import { CorporatePageLayout } from "../../components/CorporatePageLayout";

export default function KullanimKosullariPage() {
  return (
    <CorporatePageLayout
      eyebrow="Yasal"
      title="Kullanım Koşullarımız"
      lead="Platformu kullanırken geçerli olan üyelik, içerik ve sorumluluk esasları (demo metin)."
    >
      <div className="corporate-prose module-panel">
        <p>
          Marketplace, ihale ve mesaj modüllerini kullanan taraflar doğru ilan bilgisi vermekle yükümlüdür.
          İhale ve teklif süreçleri platform kayıtlarına tabidir. Nihai sözleşme metni yayımlandığında bu
          sayfa güncellenecektir.
        </p>
      </div>
    </CorporatePageLayout>
  );
}
