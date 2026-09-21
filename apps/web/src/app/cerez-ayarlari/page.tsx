import { CorporatePageLayout } from "../../components/CorporatePageLayout";

export default function CerezAyarlariPage() {
  return (
    <CorporatePageLayout
      eyebrow="Yasal"
      title="Çerez Ayarları"
      lead="Oturum, dil tercihi ve analitik amaçlı çerezler hakkında bilgi (demo)."
    >
      <div className="corporate-prose module-panel">
        <p>
          Web uygulaması oturum ve dil seçimi için zorunlu çerezler kullanabilir. Pazarlama çerezleri
          varsayılan olarak kapalıdır. Canlı ortamda tercih paneli bu sayfaya entegre edilecektir.
        </p>
      </div>
    </CorporatePageLayout>
  );
}
