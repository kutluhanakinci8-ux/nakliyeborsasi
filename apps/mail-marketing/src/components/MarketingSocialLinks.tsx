"use client";

import {
  MARKETING_SOCIAL_LINKS,
  type MarketingSocialId,
} from "@/lib/marketingSocialLinks";

function SocialIcon({ id }: { id: MarketingSocialId }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true as const,
  };

  switch (id) {
    case "linkedin":
      return (
        <svg {...common}>
          <path
            d="M6 9h3v12H6V9zm1.5-4.5a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5zM11 9h2.9v1.6h.04c.4-.76 1.38-1.56 2.84-1.56 3.04 0 3.6 2 3.6 4.6V21H16.5v-7.1c0-1.7-.03-3.88-2.37-3.88-2.37 0-2.73 1.85-2.73 3.76V21H11V9z"
            fill="currentColor"
          />
        </svg>
      );
    case "instagram":
      return (
        <svg {...common}>
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="5"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
          <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
        </svg>
      );
    case "x":
      return (
        <svg {...common}>
          <path
            d="M5 5l6.8 9.2L5.2 19h2.4l5.3-6.1 4.3 6.1H19l-7.2-10.1L18.3 5h-2.4l-4.9 5.6L7.4 5H5z"
            fill="currentColor"
          />
        </svg>
      );
    case "youtube":
      return (
        <svg {...common}>
          <path
            d="M10 9.5v5.2l4.5-2.6L10 9.5z"
            fill="currentColor"
          />
          <path
            d="M20 8.2s-.2-1.4-.8-2c-.8-.8-1.6-.8-2-.9C15.4 5 12 5 12 5h0s-3.4 0-5.2.3c-.4 0-1.2.1-2 .9-.6.6-.8 2-.8 2S4 9.6 4 11v1.8c0 1.4.2 2.8.2 2.8s.2 1.4.8 2c.8.8 1.8.8 2.3.9 1.7.2 7.7.2 7.7.2s3.4 0 5.2-.3c.4-.1 1.2-.1 2-.9.6-.6.8-2 .8-2S20 14.4 20 13V11c0-1.4-.2-2.8-.2-2.8z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      );
    default:
      return null;
  }
}

export function MarketingSocialLinks() {
  return (
    <div className="site-footer__social" role="list" aria-label="Sosyal medya">
      {MARKETING_SOCIAL_LINKS.map((item) => {
        const pending = item.href === "#" || item.href === "";
        return (
          <a
            key={item.id}
            role="listitem"
            href={item.href}
            className={`site-footer__social-link${pending ? " is-pending" : ""}`}
            aria-label={item.label}
            title={pending ? `${item.label} — bağlantı yakında` : item.label}
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
            <SocialIcon id={item.id} />
          </a>
        );
      })}
    </div>
  );
}
