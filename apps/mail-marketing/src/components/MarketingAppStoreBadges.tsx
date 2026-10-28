"use client";

import type { ReactNode } from "react";

const PLAY =
  process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL ?? "#";
const APP_STORE =
  process.env.NEXT_PUBLIC_APP_STORE_URL ?? "#";

function StoreBadge({
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

export function MarketingAppStoreBadges() {
  return (
    <div className="site-footer__stores" aria-label="Mobil uygulama mağazaları">
      <StoreBadge href={PLAY} label="Google Play'den indir">
        <svg viewBox="0 0 135 40" width={135} height={40} aria-hidden>
          <rect width="135" height="40" rx="6" fill="#1a1508" />
          <path
            d="M11 8.5 22.5 20 11 31.5V8.5z"
            fill="#34A853"
          />
          <path d="M11 8.5 22.5 20 28 16.5 11 8.5z" fill="#FBBC04" />
          <path d="M11 31.5 22.5 20 28 23.5 11 31.5z" fill="#EA4335" />
          <path d="M28 16.5 22.5 20 28 23.5 33 20 28 16.5z" fill="#4285F4" />
          <text
            x="38"
            y="15"
            fill="#fff"
            fontSize="7"
            fontFamily="system-ui,sans-serif"
          >
            GET IT ON
          </text>
          <text
            x="38"
            y="28"
            fill="#fff"
            fontSize="12"
            fontWeight="600"
            fontFamily="system-ui,sans-serif"
          >
            Google Play
          </text>
        </svg>
      </StoreBadge>
      <StoreBadge href={APP_STORE} label="App Store'dan indir">
        <svg viewBox="0 0 135 40" width={135} height={40} aria-hidden>
          <rect width="135" height="40" rx="6" fill="#1a1508" />
          <path
            d="M22 10.5c-.1 1.2.4 2.4 1.1 3.2-.9 1-2.2 1.7-3.5 1.6-.2-1.1.4-2.3 1-3.1.9-1 2.4-1.8 3.8-1.7h.6zm.7 3.8c1.9-.1 3.5 1.1 4.3 1.1.9 0 2.3-1.1 3.8-1 .7 0 2.6.3 3.8 2.2-1 .7-1.9 2.1-1.9 3.4 0 2.4 2.1 3.3 2.1 3.3s0 .1-.1.2c-.4 1.3-1.8 2.2-3.1 2.2-1 0-1.7-.6-2.8-.6-1.1 0-1.9.6-3 .6-1.2 0-2.3-.9-3-2.3-1.6-2.8-2.8-7.1-1.2-10.2.8-1.5 2.2-2.4 3.7-2.4z"
            fill="#fff"
            transform="translate(-2 4) scale(0.95)"
          />
          <text
            x="38"
            y="15"
            fill="#fff"
            fontSize="7"
            fontFamily="system-ui,sans-serif"
          >
            Download on the
          </text>
          <text
            x="38"
            y="28"
            fill="#fff"
            fontSize="12"
            fontWeight="600"
            fontFamily="system-ui,sans-serif"
          >
            App Store
          </text>
        </svg>
      </StoreBadge>
    </div>
  );
}
