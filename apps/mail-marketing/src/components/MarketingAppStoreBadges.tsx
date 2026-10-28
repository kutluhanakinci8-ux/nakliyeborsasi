"use client";

import type { ReactNode } from "react";

const PLAY = process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL ?? "#";
const APP_STORE = process.env.NEXT_PUBLIC_APP_STORE_URL ?? "#";

function StoreBadgeLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  const pending = href === "#" || href === "";
  return (
    <a
      href={href}
      className={`site-footer__store-badge${pending ? " is-pending" : ""}`}
      aria-label={label}
      title={pending ? `${label} — yakında` : label}
      target={pending ? undefined : "_blank"}
      rel={pending ? undefined : "noopener noreferrer"}
      onClick={
        pending
          ? (e) => {
              e.preventDefault();
            }
          : undefined
      }
    >
      {children}
    </a>
  );
}

/** Açık zemin, altın çerçeve — koyu blok yok; net ikon + tipografi. */
export function MarketingAppStoreBadges() {
  return (
    <div className="site-footer__stores" aria-label="Mobil uygulama mağazaları">
      <StoreBadgeLink href={PLAY} label="Google Play'den indir">
        <span className="site-footer__store-badge-icon" aria-hidden>
          <svg viewBox="0 0 24 24" width={32} height={32} aria-hidden>
            <path d="M3 4.5 14.5 12 3 19.5V4.5z" fill="#34A853" />
            <path d="M3 4.5 14.5 12 17.5 9.5 3 4.5z" fill="#FBBC04" />
            <path d="M3 19.5 14.5 12 17.5 14.5 3 19.5z" fill="#EA4335" />
            <path d="M17.5 9.5 14.5 12 17.5 14.5 20 12 17.5 9.5z" fill="#4285F4" />
          </svg>
        </span>
        <span className="site-footer__store-badge-text">
          <span className="site-footer__store-badge-eyebrow">İndir</span>
          <span className="site-footer__store-badge-title">Google Play</span>
        </span>
      </StoreBadgeLink>
      <StoreBadgeLink href={APP_STORE} label="App Store'dan indir">
        <span className="site-footer__store-badge-icon site-footer__store-badge-icon--apple" aria-hidden>
          <svg viewBox="0 0 24 24" width={30} height={30} aria-hidden>
            <path
              fill="currentColor"
              d="M17.05 3.28c-.03 1.78-1.3 3.32-2.65 4.26-1.02.78-2.78 1.38-4.2 1.42-.08-1.62.58-3.28 1.35-4.32C12.55 3.62 14.58 2.82 17.05 3.28zm.95 6.02c2.62-.12 4.85 1.48 6.08 1.48 1.22 0 3.35-1.35 5.62-1.28 1.08.02 3.75.38 5.52 2.88-.14.1-3.3 1.92-3.28 5.72.02 4.28 3.72 5.72 3.78 5.75-.04.12-.58 1.98-1.92 3.32-1.15 1.18-2.38 2.35-4.28 2.35-1.42 0-1.85-.92-3.45-.92-1.62 0-2.08.9-3.48.92-2.22.04-3.92-2.28-5.05-4.45-2.72-5.02-3.02-10.92-1.35-14.05 1.18-2.35 3.25-3.82 5.52-3.85 2.15-.03 4.18 1.42 5.18 1.42.98 0 3.15-1.75 5.32-1.48z"
              transform="scale(0.52) translate(2 4)"
            />
          </svg>
        </span>
        <span className="site-footer__store-badge-text">
          <span className="site-footer__store-badge-eyebrow">İndir</span>
          <span className="site-footer__store-badge-title">App Store</span>
        </span>
      </StoreBadgeLink>
    </div>
  );
}
