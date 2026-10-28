"use client";

const WEBM_SRC = "/brand/lerta-brand-transparent.webm";
const MP4_SRC = "/brand/lerta-hero-animation.mp4";
const POSTER_SRC = "/brand/lerta-hero-poster.jpg";

type Props = {
  variant?: "header" | "hero";
  className?: string;
};

export function LertaBrandLogoVideo({
  variant = "hero",
  className = "",
}: Props) {
  return (
    <span
      className={`lerta-brand-logo lerta-brand-logo--${variant} ${className}`.trim()}
    >
      <video
        className="lerta-brand-logo__video"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster={POSTER_SRC}
        aria-hidden={variant === "header"}
        aria-label={variant === "hero" ? "Lerta marka animasyonu" : undefined}
      >
        <source src={WEBM_SRC} type="video/webm" />
        <source src={MP4_SRC} type="video/mp4" />
      </video>
    </span>
  );
}
