"use client";

import Image from "next/image";
import Link from "next/link";
import { PublicPageShell } from "../../components/PublicPageShell";
import { SiteLayout } from "../../components/SiteLayout";
import { BLOG_POSTS, type BlogPostSummary } from "../../lib/siteNavigation";

const PAGE_SUBNAV = [
  { href: "#one-cikan", label: "Öne çıkan" },
  { href: "#yazilar", label: "Tüm yazılar" },
  { href: "#konular", label: "Konular" },
  { href: "#abonelik", label: "Bülten" },
] as const;

const HERO_STATS = [
  { value: String(BLOG_POSTS.length), label: "Yayın", highlight: true },
  { value: "3", label: "Ana tema" },
  { value: "TR · UA · EU", label: "Koridor" },
] as const;

const TOPICS = ["Sektör", "Ürün", "Entegrasyon", "Koridor", "Güven", "İhale"] as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function FeaturedPost({ post }: { post: BlogPostSummary }) {
  return (
    <article className="blog-premium-featured">
      <Link href={`/blog/${post.slug}`} className="blog-premium-featured-media">
        <Image
          src={post.coverImage}
          alt=""
          width={640}
          height={480}
          className="about-premium-photo"
          priority
        />
      </Link>
      <div className="blog-premium-featured-copy">
        <span className="press-premium-tag">{post.category}</span>
        <time className="press-premium-date" dateTime={post.publishedAt}>
          {formatDate(post.publishedAt)} · {post.readMinutes} dk okuma
        </time>
        <h2>
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h2>
        <p>{post.excerpt}</p>
        <Link href={`/blog/${post.slug}`} className="press-premium-inline-link">
          Devamını oku →
        </Link>
      </div>
    </article>
  );
}

function PostCard({ post }: { post: BlogPostSummary }) {
  return (
    <article className="blog-premium-card">
      <Link href={`/blog/${post.slug}`} className="blog-premium-card-media">
        <Image src={post.coverImage} alt="" width={400} height={300} />
      </Link>
      <div className="blog-premium-card-body">
        <span className="press-premium-tag">{post.category}</span>
        <time className="press-premium-date" dateTime={post.publishedAt}>
          {formatDate(post.publishedAt)}
        </time>
        <h3>
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h3>
        <p>{post.excerpt}</p>
        <Link href={`/blog/${post.slug}`} className="press-premium-inline-link">
          Oku →
        </Link>
      </div>
    </article>
  );
}

export function BlogPageClient() {
  const featured = BLOG_POSTS[0];
  const rest = BLOG_POSTS.slice(1);

  return (
    <SiteLayout headerVariant="public">
      <PublicPageShell
        pageClassName="blog-premium-page about-premium-page"
        breadcrumbLabel="Blog"
        eyebrow="İçerik merkezi"
        title="Sektör ve ürün yazıları"
        lead="Koridor haberleri, ürün güncellemeleri ve entegrasyon rehberleri. Lerta Logistics ekibinden ve sektörden notlar."
        stats={[...HERO_STATS]}
        subnav={PAGE_SUBNAV}
        heroAside={
          <div className="about-premium-hero-visual">
            <Image
              src="/media/blog/blog-hero-editorial.jpg"
              alt="Lojistik ve dijital borsa editöryal görseli"
              width={640}
              height={360}
              priority
              className="about-premium-hero-photo"
            />
            <div className="about-premium-hero-badge" aria-hidden>
              <span className="about-premium-hero-badge-dot" />
              Editöryal · 2026
            </div>
          </div>
        }
      >
        <section id="one-cikan" className="blog-premium-featured-wrap module-panel">
          <header className="press-premium-section-head--left about-premium-section-head press-premium-section-head--left">
            <p className="about-premium-kicker">Öne çıkan</p>
            <h2 className="about-premium-h2">Son köşe yazısı</h2>
          </header>
          <FeaturedPost post={featured} />
        </section>

        <section id="yazilar" className="blog-premium-grid-section module-panel">
          <header className="about-premium-section-head">
            <p className="about-premium-kicker">Arşiv</p>
            <h2 className="about-premium-h2">Tüm yazılar</h2>
          </header>
          <div className="blog-premium-grid">
            {rest.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        </section>

        <section id="konular" className="blog-premium-topics module-panel">
          <header className="about-premium-section-head">
            <p className="about-premium-kicker">Konular</p>
            <h2 className="about-premium-h2">Neleri okuyabilirsiniz?</h2>
          </header>
          <ul className="press-premium-topic-chips">
            {TOPICS.map((topic) => (
              <li key={topic}>{topic}</li>
            ))}
          </ul>
        </section>

        <section id="abonelik" className="about-premium-cta module-panel blog-premium-newsletter">
          <div className="about-premium-cta-inner">
            <div>
              <h2 className="about-premium-h2">Yeni yazılardan haberdar olun</h2>
              <p className="about-premium-body">
                Bülten henüz demo aşamasında; güncellemeler için iletişim formuna e-posta
                adresinizi bırakabilirsiniz.
              </p>
            </div>
            <div className="about-premium-cta-actions">
              <Link href="/iletisim" className="btn-gold-wide about-premium-cta-primary">
                Bülten talebi
              </Link>
              <Link href="/basin" className="about-premium-cta-secondary">
                Basın merkezi
              </Link>
            </div>
          </div>
        </section>
      </PublicPageShell>
    </SiteLayout>
  );
}
