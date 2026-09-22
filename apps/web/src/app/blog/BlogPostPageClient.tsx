"use client";

import Image from "next/image";
import Link from "next/link";
import { PublicPageShell } from "../../components/PublicPageShell";
import { SiteLayout } from "../../components/SiteLayout";
import {
  BLOG_POSTS,
  type BlogPostSummary,
  findBlogPost,
} from "../../lib/siteNavigation";

const ARTICLE_SECTIONS: Record<string, string[]> = {
  "tr-ua-eu-koridoru-2026": [
    "Türkiye — Ukrayna — Avrupa Birliği hattında yük arayan firmalar artık yalnızca telefon ve Excel ile ilerlemek istemiyor. Dijital borsalar; ilan, teklif, güven ve mesajlaşmayı tek kimlik altında topluyor.",
    "Sınır geçişleri ve sigorta süreçleri hâlâ operasyonel darboğaz; ancak e-irsaliye ve entegrasyon katmanları bu süreçleri platform içinde izlenebilir kılıyor. Nakliye Borsası demo ortamı bu trendleri TR · UA · EU senaryolarıyla simüle ediyor.",
    "Önümüzdeki fazlarda filo, ödeme ve uyum modülleri aynı kurumsal tasarım diline eklenecek.",
  ],
  "ihale-ve-teklif-guveni": [
    "İhale oturumlarında minimum teklif, süre ve para birimi kuralları şeffaflığı artırır; ancak taşıyıcı seçimi için güven skoru kritik tamamlayıcıdır.",
    "Platform içi mesajlaşma kayıt altında tutulur; değerlendirmeler ve ortalama puan güven merkezinde görünür. Böylece hem yük veren hem taşıyıcı tarafında tekrarlayan risk azalır.",
    "Nakliye Borsası’nda ihale modülü marketplace ile aynı firma profiline bağlanır — admin ve üye tarafında tutarlı veri.",
  ],
  "dis-kaynak-entegrasyonu": [
    "Lardi, Della ve benzeri kaynaklardan gelen teklifler farklı formatlarda gelir. Adapter katmanı bu veriyi normalize eder; kullanıcı tek arama kutusundan sonuç görür.",
    "Operasyon ekipleri için fayda net: daha az sekme, daha az kopyala-yapıştır, daha hızlı karar. Entegrasyon modülü canlı demo ortamında test edilebilir.",
    "Kurumsal IT ekipleri için açık API yol haritası, mevcut TMS ve ERP süreçlerine köprü kurmayı hedefler.",
  ],
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function BlogPostPageClient({ slug }: { slug: string }) {
  const post = findBlogPost(slug);
  if (!post) {
    return null;
  }

  const sections = ARTICLE_SECTIONS[post.slug] ?? [post.excerpt];
  const related = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 2);

  return (
    <SiteLayout headerVariant="public">
      <PublicPageShell
        pageClassName="blog-premium-page blog-premium-article about-premium-page"
        breadcrumbLabel="Blog yazısı"
        eyebrow={post.category}
        title={post.title}
        lead={post.excerpt}
        stats={[
          { value: formatDate(post.publishedAt), label: "Yayın" },
          { value: `${post.readMinutes} dk`, label: "Okuma", highlight: true },
          { value: "TR · UA · EU", label: "Koridor" },
        ]}
        heroAside={
          <div className="about-premium-hero-visual">
            <Image
              src={post.coverImage}
              alt=""
              width={640}
              height={360}
              priority
              className="about-premium-hero-photo"
            />
          </div>
        }
      >
        <article className="blog-premium-article-body module-panel">
          {sections.map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className="blog-premium-paragraph">
              {paragraph}
            </p>
          ))}
          <p className="blog-premium-demo-note">
            Bu yazı demo içeriktir. Canlı blog CMS entegrasyonu sonraki fazda eklenecektir.
            Platformu denemek için{" "}
            <Link href="/marketplace">yük arama</Link> modülüne geçebilirsiniz.
          </p>
          <Link href="/blog" className="press-premium-inline-link">
            ← Tüm yazılar
          </Link>
        </article>

        {related.length > 0 ? (
          <section className="blog-premium-related module-panel">
            <h2 className="about-premium-h2">İlgili yazılar</h2>
            <ul className="blog-premium-related-list">
              {related.map((item: BlogPostSummary) => (
                <li key={item.slug}>
                  <Link href={`/blog/${item.slug}`} className="blog-premium-related-link">
                    <Image src={item.coverImage} alt="" width={120} height={90} />
                    <span>
                      <span className="press-premium-tag">{item.category}</span>
                      <strong>{item.title}</strong>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </PublicPageShell>
    </SiteLayout>
  );
}
