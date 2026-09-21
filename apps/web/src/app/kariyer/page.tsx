import Link from "next/link";
import { CorporatePageLayout } from "../../components/CorporatePageLayout";

const OPENINGS = [
  {
    title: "Full-stack geliştirici (NestJS / Next.js)",
    location: "Uzaktan · TR / UA",
    type: "Tam zamanlı",
  },
  {
    title: "Koridor operasyon uzmanı",
    location: "İstanbul / Kyiv",
    type: "Hibrit",
  },
  {
    title: "İş geliştirme — lojistik partnerleri",
    location: "AB + Türkiye",
    type: "Tam zamanlı",
  },
] as const;

export default function KariyerPage() {
  return (
    <CorporatePageLayout
      eyebrow="Kariyer"
      title="Ekibimize katılın"
      lead="Ürün, operasyon ve entegrasyon ekiplerimiz büyüyor. Lojistik teknolojisine tutkulu profesyoneller arıyoruz."
    >
      <div className="corporate-grid">
        {OPENINGS.map((job) => (
          <article key={job.title} className="corporate-card">
            <h2>{job.title}</h2>
            <p className="muted muted--dark">
              {job.location} · {job.type}
            </p>
            <Link href="/iletisim" className="corporate-card-link">
              Başvuru için iletişim →
            </Link>
          </article>
        ))}
      </div>
    </CorporatePageLayout>
  );
}
