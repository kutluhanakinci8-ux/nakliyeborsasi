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
  const isHeader = variant === "header";

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
        aria-hidden={isHeader}
        aria-label={isHeader ? undefined : "Lerta marka animasyonu"}
        {...(isHeader ? { src: MP4_SRC } : {})}
      >
        {!isHeader ? (
          <>
            <source src={WEBM_SRC} type="video/webm" />
            <source src={MP4_SRC} type="video/mp4" />
          </>
        ) : null}
      </video>
    </span>
  );
}
