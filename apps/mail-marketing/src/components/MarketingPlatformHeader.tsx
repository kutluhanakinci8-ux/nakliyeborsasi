"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LertaBrandLogoVideo } from "./LertaBrandLogoVideo";
import {
  PRODUCT_TABS,
  ctasForProduct,
  resolveProductId,
} from "@/lib/platformNav";
import { metaNavForProduct } from "@/lib/marketingMetaNav";

export function MarketingPlatformHeader() {
  const pathname = usePathname() ?? "/";
  const productId = resolveProductId(pathname);
  const ctas = ctasForProduct(productId);
  const metaNav = metaNavForProduct(productId);

  return (
    <header className="platform-header platform-header--premium">
      <div className="platform-header-inner">
        <div className="platform-header-row">
          <Link
            href="/"
            className="brand lerta-brand lerta-brand--animated"
            aria-label="Lerta ana sayfa"
          >
            <LertaBrandLogoVideo variant="header" />
          </Link>

          <nav className="platform-product-nav" aria-label="Ürünler">
            {PRODUCT_TABS.map((tab) => {
              const active = productId === tab.id;
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={active ? "is-active" : undefined}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          <div className="platform-header-actions">
            <div className="platform-header-actions__meta">
              {metaNav.map((item) => (
                <Link
                  key={item.href}
                  className="platform-meta-link"
                  href={item.href}
                  title={item.description}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="platform-header-actions__ctas">
              {ctas.map((cta) => (
                <a
                  key={`${cta.href}-${cta.label}`}
                  href={cta.href}
                  className={
                    cta.variant === "primary"
                      ? "btn btn-primary platform-cta"
                      : "btn btn-ghost platform-cta"
                  }
                >
                  {cta.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
