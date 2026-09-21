import { CorporatePageLayout } from "../../components/CorporatePageLayout";

export default function HakkimizdaPage() {
  return (
    <CorporatePageLayout
      eyebrow="Hakkımızda"
      title="Nakliye Borsası kimdir?"
      lead="Türkiye — Ukrayna — Avrupa Birliği koridoruna odaklanan dijital yük ve taşıma borsası. Taşıyıcıları, nakliyecileri ve forwarder’ları aynı veri modelinde buluşturuyoruz."
    >
      <div className="corporate-prose module-panel">
        <h2>Misyon</h2>
        <p>
          Koridor genelinde yük arama, ihale, mesajlaşma ve güven skorunu tek platformda
          sunmak; harici borsalarla entegrasyon ile operasyon yükünü azaltmak.
        </p>
        <h2>Vizyon</h2>
        <p>
          Bölgesel lider dijital nakliye borsası olmak — şeffaf fiyat, güvenilir partner ve
          çok dilli (TR, EN, UK, RU) deneyim.
        </p>
        <h2>Koridor odağı</h2>
        <p>
          Demo ortamımız TR · UA · EU hattını simüle eder. Canlıya geçişte sınır, sigorta ve
          filo modülleri aynı tasarım diline eklenir.
        </p>
      </div>
    </CorporatePageLayout>
  );
}
