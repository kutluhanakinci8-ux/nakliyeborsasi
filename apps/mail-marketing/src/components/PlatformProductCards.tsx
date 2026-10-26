import Link from "next/link";
import type { PlatformProduct } from "@/lib/platformProducts";
import { MarketingIcon } from "./MarketingIcons";

function isInternal(href: string): boolean {
  return href.startsWith("/");
}

function ProductIcon({ slug }: { slug: PlatformProduct["slug"] }) {
  if (slug === "posta") {
    return <MarketingIcon name="mail" className="premium-icon" />;
  }
  if (slug === "mesaj") {
    return <MarketingIcon name="inbox" className="premium-icon" />;
  }
  return <MarketingIcon name="shield" className="premium-icon" />;
}

export function PlatformProductCards({
  products,
  featuredSlug,
}: {
  products: PlatformProduct[];
  featuredSlug?: PlatformProduct["slug"];
}) {
  return (
    <div className="platform-grid platform-grid--products" role="list">
      {products.map((product) => {
        const featured = product.slug === featuredSlug;
        return (
          <article
            key={product.slug}
            className={`platform-card platform-card--${product.accent} platform-card--premium${
              featured ? " platform-card--featured" : ""
            }`}
            role="listitem"
          >
            {featured ? (
              <span className="platform-card__badge">Öne çıkan</span>
            ) : null}
            <div className="platform-card__icon-wrap" aria-hidden="true">
              <ProductIcon slug={product.slug} />
            </div>
            <p className="platform-card-eyebrow">{product.tagline}</p>
            <h2 className="platform-card-title">{product.name}</h2>
            <p className="platform-card-summary">{product.summary}</p>
            <ul className="platform-card-features">
              {product.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <div className="platform-card-actions">
              {isInternal(product.href) ? (
                <Link className="btn btn-primary" href={product.href}>
                  {product.ctaLabel}
                </Link>
              ) : (
                <a className="btn btn-primary" href={product.href}>
                  {product.ctaLabel}
                </a>
              )}
              {product.secondaryHref && product.secondaryLabel ? (
                isInternal(product.secondaryHref) ? (
                  <Link className="btn btn-ghost" href={product.secondaryHref}>
                    {product.secondaryLabel}
                  </Link>
                ) : (
                  <a className="btn btn-ghost" href={product.secondaryHref}>
                    {product.secondaryLabel}
                  </a>
                )
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
