"use client";

const PLAY = process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL ?? "#";
const APP_STORE = process.env.NEXT_PUBLIC_APP_STORE_URL ?? "#";

function StoreIconLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  const pending = href === "#" || href === "";
  return (
    <a
      href={href}
      className={`site-footer__store-icon${pending ? " is-pending" : ""}`}
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

/** Yalnızca mağaza ikonları — koyu zemin yok. */
export function MarketingAppStoreBadges() {
  return (
    <div className="site-footer__stores" aria-label="Mobil uygulama mağazaları">
      <StoreIconLink href={PLAY} label="Google Play'den indir">
        <svg viewBox="0 0 40 40" width={40} height={40} aria-hidden>
          <path d="M8 6.5 28 20 8 33.5V6.5z" fill="#34A853" />
          <path d="M8 6.5 28 20 33 16 8 6.5z" fill="#FBBC04" />
          <path d="M8 33.5 28 20 33 24 8 33.5z" fill="#EA4335" />
          <path d="M33 16 28 20 33 24 36 20 33 16z" fill="#4285F4" />
        </svg>
      </StoreIconLink>
      <StoreIconLink href={APP_STORE} label="App Store'dan indir">
        <svg viewBox="0 0 40 40" width={40} height={40} aria-hidden>
          <path
            d="M26.2 6.5c.2 1.3-.4 2.6-1.1 3.5-.9 1.1-2.4 2-3.8 1.9-.2-1.2.5-2.5 1.1-3.3 1-1.1 2.6-2 3.8-2.1zm1.2 5.2c2.1-.2 3.9 1.2 4.8 1.2.9 0 2.6-1.1 4.3-1 .8 0 2.9.3 4.2 2.4-.1.1-2.5 1.5-2.5 4.4 0 3.4 3 4.6 3 4.6s0 .1-.1.2c-.5 1.5-2 2.5-3.4 2.5-1.1 0-1.9-.7-3.1-.7-1.2 0-2 .7-3.2.7-1.4 0-2.6-1-3.3-2.5-1.1-2.1-2-5.3-.9-7.6.8-1.6 2.3-2.6 3.9-2.6z"
            fill="currentColor"
            transform="translate(-4 4) scale(0.88)"
          />
        </svg>
      </StoreIconLink>
    </div>
  );
}
