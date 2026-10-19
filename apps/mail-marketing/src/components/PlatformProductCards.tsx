import Link from "next/link";
import type { PlatformProduct } from "@/lib/platformProducts";

function isInternal(href: string): boolean {
  return href.startsWith("/");
}

export function PlatformProductCards({ products }: { products: PlatformProduct[] }) {
  return (
    <div className="platform-grid" role="list">
      {products.map((product) => (
        <article
          key={product.slug}
          className={`platform-card platform-card--${product.accent}`}
          role="listitem"
        >
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
      ))}
    </div>
  );
}
