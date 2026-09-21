import { CorporatePageLayout } from "../../components/CorporatePageLayout";

const PRESS_ITEMS = [
  {
    date: "2026-09-10",
    title: "Nakliye Borsası demo platformu TR–UA koridorunda açıldı",
    summary: "Marketplace, ihale ve güven modülleri birlikte sunuluyor.",
  },
  {
    date: "2026-08-05",
    title: "Harici adapter entegrasyonu: Lardi ve Della veri birleştirme",
    summary: "Tek arama ile çoklu kaynak teklifleri normalize ediliyor.",
  },
  {
    date: "2026-07-12",
    title: "Çok dilli arayüz: Türkçe, İngilizce, Ukraynaca, Rusça",
    summary: "API ve web arayüzünde locale desteği tamamlandı.",
  },
] as const;

export default function BasinPage() {
  return (
    <CorporatePageLayout
      eyebrow="Basın"
      title="Basın bültenleri"
      lead="Medya ve iş ortakları için duyurular. Detaylı basın kiti için iletişim formunu kullanın."
    >
      <ul className="press-list">
        {PRESS_ITEMS.map((item) => (
          <li key={item.title} className="press-item module-panel">
            <time className="press-date">{item.date}</time>
            <h2>{item.title}</h2>
            <p>{item.summary}</p>
          </li>
        ))}
      </ul>
    </CorporatePageLayout>
  );
}
