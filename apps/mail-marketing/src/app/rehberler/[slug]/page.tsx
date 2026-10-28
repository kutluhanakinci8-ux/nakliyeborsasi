import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GuideArticleBody } from "@/components/GuideArticleBody";
import { MarketingPageShell } from "@/components/MarketingPageShell";
import {
  GUIDE_CATEGORY_LABELS,
  getGuideBySlug,
  MARKETING_GUIDES,
} from "@/lib/marketingGuides";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return MARKETING_GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) return { title: "Rehber — Lerta" };
  return {
    title: `${guide.title} — Lerta rehber`,
    description: guide.summary,
  };
}

export default async function RehberSlugPage({ params }: PageProps) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) notFound();

  return (
    <MarketingPageShell
      narrow
      contentClassName="platform-content--product-vitrin platform-content--support-docs"
    >
      <nav className="breadcrumb breadcrumb--premium" aria-label="Breadcrumb">
        <Link href="/">Lerta</Link>
        <span aria-hidden="true">/</span>
        <Link href="/destek">Destek</Link>
        <span aria-hidden="true">/</span>
        <Link href="/rehberler">Rehberler</Link>
        <span aria-hidden="true">/</span>
        <span>{guide.title}</span>
      </nav>

      <p className="guide-index__cat">{GUIDE_CATEGORY_LABELS[guide.category]}</p>
      <h1 className="section-title section-title--lg">{guide.title}</h1>
      <p className="pricing-lead">{guide.summary}</p>
      <p className="guide-index__meta">
        Yaklaşık {guide.readMinutes} dk okuma
      </p>

      <GuideArticleBody guide={guide} />
    </MarketingPageShell>
  );
}
