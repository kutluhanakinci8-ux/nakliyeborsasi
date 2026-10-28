"use client";

import { useState } from "react";

const WEBM_SRC = "/brand/lerta-brand-transparent.webm";
const MP4_SRC = "/brand/lerta-hero-animation.mp4";
const PNG_SRC = "/brand/lerta-brand-header.png";
const POSTER_SRC = "/brand/lerta-hero-poster.jpg";

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
            poster={PNG_SRC}
            aria-hidden
            onError={() => setHeaderVideoFailed(true)}
          >
            <source src={WEBM_SRC} type="video/webm" />
          </video>
        ) : (
          <img
            className="lerta-brand-logo__img-fallback"
            src={PNG_SRC}
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
        poster={POSTER_SRC}
        aria-label="Lerta marka animasyonu"
      >
        <source src={WEBM_SRC} type="video/webm" />
        <source src={MP4_SRC} type="video/mp4" />
      </video>
    </span>
  );
}
