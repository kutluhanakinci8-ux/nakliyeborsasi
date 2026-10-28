"use client";

import { useState } from "react";

/** Bump when brand alpha assets are regenerated (cache bust on CDN/browser). */
const BRAND_ASSET_REV = "4";

const webmSrc = `/brand/lerta-brand-transparent.webm?v=${BRAND_ASSET_REV}`;
const pngSrc = `/brand/lerta-brand-header.png?v=${BRAND_ASSET_REV}`;
const posterSrc = `/brand/lerta-hero-poster.jpg?v=${BRAND_ASSET_REV}`;

type Props = {
  variant?: "header" | "hero";
  className?: string;
};

export function LertaBrandLogoVideo({
  variant = "hero",
  className = "",
}: Props) {
  const isHeader = variant === "header";
  const [headerVideoFailed, setHeaderVideoFailed] = useState(false);

  if (isHeader) {
    return (
      <span
        className={`lerta-brand-logo lerta-brand-logo--header ${className}`.trim()}
      >
        {!headerVideoFailed ? (
          <video
            className="lerta-brand-logo__video lerta-brand-logo__video--alpha"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            poster={pngSrc}
            aria-hidden
            onError={() => setHeaderVideoFailed(true)}
          >
            <source src={webmSrc} type="video/webm" />
          </video>
        ) : (
          <img
            className="lerta-brand-logo__img-fallback"
            src={pngSrc}
            alt=""
            aria-hidden
            decoding="async"
          />
        )}
      </span>
    );
  }

  return (
    <span
      className={`lerta-brand-logo lerta-brand-logo--hero ${className}`.trim()}
    >
      <video
        className="lerta-brand-logo__video lerta-brand-logo__video--alpha"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster={posterSrc}
        aria-label="Lerta marka animasyonu"
      >
        <source src={webmSrc} type="video/webm" />
      </video>
    </span>
  );
}
