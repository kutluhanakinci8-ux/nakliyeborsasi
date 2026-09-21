import Link from "next/link";
import { CorporatePageLayout } from "../../components/CorporatePageLayout";
import { BLOG_POSTS } from "../../lib/siteNavigation";

export default function BlogPage() {
  return (
    <CorporatePageLayout
      eyebrow="Blog"
      title="Sektör ve ürün yazıları"
      lead="Koridor haberleri, ürün güncellemeleri ve entegrasyon ipuçları."
    >
      <ul className="blog-list">
        {BLOG_POSTS.map((post) => (
          <li key={post.slug}>
            <article className="blog-card module-panel">
              <span className="blog-category">{post.category}</span>
              <time className="blog-date">{post.publishedAt}</time>
              <h2>
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
              <p>{post.excerpt}</p>
              <Link href={`/blog/${post.slug}`} className="corporate-card-link">
                Devamını oku →
              </Link>
            </article>
          </li>
        ))}
      </ul>
    </CorporatePageLayout>
  );
}
