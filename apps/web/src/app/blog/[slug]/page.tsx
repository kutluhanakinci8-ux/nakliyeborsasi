import Link from "next/link";
import { notFound } from "next/navigation";
import { CorporatePageLayout } from "../../../components/CorporatePageLayout";
import { findBlogPost } from "../../../lib/siteNavigation";

type BlogPostPageProps = {
  params: { slug: string };
};

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const post = findBlogPost(params.slug);
  if (!post) {
    notFound();
  }

  return (
    <CorporatePageLayout
      eyebrow="Blog"
      title={post.title}
      lead={`${post.category} · ${post.publishedAt}`}
    >
      <article className="corporate-prose module-panel">
        <p>{post.excerpt}</p>
        <p>
          Bu yazı demo içeriktir. Canlı blog CMS entegrasyonu sonraki fazda eklenecektir.
          Platform özelliklerini denemek için{" "}
          <Link href="/marketplace">yük arama</Link> modülüne geçebilirsiniz.
        </p>
        <Link href="/blog" className="corporate-card-link">
          ← Tüm yazılar
        </Link>
      </article>
    </CorporatePageLayout>
  );
}
