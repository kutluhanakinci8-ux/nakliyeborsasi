import Link from "next/link";

type SiteBrandProps = {
  href?: string;
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  variant?: "header" | "footer";
  tagline?: string;
};

export function SiteBrand({
  href = "/marketplace",
  size = "md",
  showTagline = true,
  variant = "header",
  tagline = "Yük ve taşıma arama",
}: SiteBrandProps) {
  const content = (
    <>
      <div className="site-brand-mark" aria-hidden>
        <svg className="site-brand-icon" viewBox="0 0 32 32" fill="none">
          <path
            d="M6 22h16l3-6V10H8v12z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <circle cx="11" cy="22" r="2.2" fill="currentColor" />
          <circle cx="21" cy="22" r="2.2" fill="currentColor" />
          <path d="M6 14h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span className="site-brand-monogram">NB</span>
      </div>
      <div className="site-brand-copy">
        <span className="site-brand-name">Nakliye Borsası</span>
        {showTagline ? (
          <span className="site-brand-tagline">{tagline}</span>
        ) : null}
      </div>
    </>
  );

  const className = [
    "site-brand",
    `site-brand--${size}`,
    variant === "footer" ? "site-brand--footer" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
