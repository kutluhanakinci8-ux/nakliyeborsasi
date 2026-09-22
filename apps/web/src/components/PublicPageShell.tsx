import Image from "next/image";
import Link from "next/link";
import { type ReactNode } from "react";
import type { ModuleStatItem } from "./ModulePageShell";

type PublicPageShellProps = {
  breadcrumbLabel: string;
  eyebrow?: string;
  title: string;
  lead: string;
  stats?: ModuleStatItem[];
  subnav?: readonly { href: string; label: string }[];
  showHeroVisual?: boolean;
  heroAside?: ReactNode;
  heroCompact?: boolean;
  pageClassName?: string;
  children: ReactNode;
};

export function PublicPageShell({
  breadcrumbLabel,
  eyebrow,
  title,
  lead,
  stats,
  subnav,
  showHeroVisual = true,
  heroAside,
  heroCompact = false,
  pageClassName,
  children,
}: PublicPageShellProps) {
  const hasHeroColumn = Boolean(heroAside) || showHeroVisual;
  const pageClass = [
    heroCompact ? "public-page public-page--compact-hero" : "public-page",
    pageClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={pageClass}>
      <section
        className={
          heroCompact ? "public-hero public-hero--compact surface-animate" : "public-hero surface-animate"
        }
      >
        <nav className="page-breadcrumb" aria-label="Konum">
          <Link href="/hakkimizda">Kurumsal</Link>
          <span aria-hidden>›</span>
          <span className="page-breadcrumb-current">{breadcrumbLabel}</span>
        </nav>
        <div
          className={
            hasHeroColumn ? "public-hero-grid" : "public-hero-grid public-hero-grid--single"
          }
        >
          <div className="public-hero-copy">
            {eyebrow ? <p className="exchange-eyebrow">{eyebrow}</p> : null}
            <h1 className="exchange-title">{title}</h1>
            <p className="exchange-lead">{lead}</p>
            {stats && stats.length > 0 ? (
              <div className="stats-strip stats-strip--hero">
                {stats.map((item) => (
                  <div
                    key={item.label}
                    className={
                      item.highlight ? "stat-item stat-item--highlight" : "stat-item"
                    }
                  >
                    <span className="stat-item-value">{item.value}</span>
                    <span className="stat-item-label">{item.label}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          {heroAside ? (
            <div className="public-hero-visual">{heroAside}</div>
          ) : showHeroVisual ? (
            <div className="public-hero-visual">
              <Image
                src="/corridor-hero.svg"
                alt=""
                width={480}
                height={320}
                priority
                className="public-hero-image"
              />
            </div>
          ) : null}
        </div>
        {subnav && subnav.length > 0 ? (
          <nav
            className="contact-subnav public-subnav contact-subnav--track"
            aria-label="Sayfa içi menü"
          >
            {subnav.map((item) => (
              <a key={item.href} href={item.href} className="contact-subnav-link">
                {item.label}
              </a>
            ))}
          </nav>
        ) : null}
      </section>
      <div className="public-content surface-stack">{children}</div>
    </div>
  );
}
