"use client";

import { useState } from "react";

const BRAND_ASSET_REV = "5";

const webmSrc = `/brand/lerta-brand-transparent.webm?v=${BRAND_ASSET_REV}`;
const pngSrc = `/brand/lerta-brand-header.png?v=${BRAND_ASSET_REV}`;
const posterSrc = `/brand/lerta-hero-poster.jpg?v=${BRAND_ASSET_REV}`;

type Props = {
  variant?: "header" | "hero";
  className?: string;
};

function BrandLogoLayers({
  variant,
  poster,
  ariaLabel,
}: {
  variant: "header" | "hero";
  poster: string;
  ariaLabel?: string;
}) {
  const [videoFailed, setVideoFailed] = useState(false);
  const videoClass =
    variant === "header"
      ? "lerta-brand-logo__video lerta-brand-logo__video--alpha"
      : "lerta-brand-logo__video lerta-brand-logo__video--alpha";

  return (
    <>
      <img
        className="lerta-brand-logo__img-base"
        src={pngSrc}
        alt=""
        aria-hidden={variant === "header"}
        decoding="async"
      />
      {!videoFailed ? (
        <video
          className={videoClass}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster={poster}
          aria-hidden={variant === "header"}
          aria-label={ariaLabel}
          onError={() => setVideoFailed(true)}
        >
          <source src={webmSrc} type="video/webm" />
        </video>
      ) : null}
    </>
  );
}

export function LertaBrandLogoVideo({
  variant = "hero",
  className = "",
}: Props) {
  const isHeader = variant === "header";

  if (isHeader) {
    return (
      <span
        className={`lerta-brand-logo lerta-brand-logo--header ${className}`.trim()}
      >
        <BrandLogoLayers variant="header" poster={pngSrc} />
      </span>
    );
  }

  return (
    <span
      className={`lerta-brand-logo lerta-brand-logo--hero ${className}`.trim()}
    >
      <BrandLogoLayers
        variant="hero"
        poster={posterSrc}
        ariaLabel="Lerta marka animasyonu"
      />
    </span>
  );
}
