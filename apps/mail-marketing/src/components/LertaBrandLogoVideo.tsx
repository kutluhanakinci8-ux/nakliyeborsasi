"use client";

/** Statik marka — animasyon kapalı (keskin PNG). */
const BRAND_ASSET_REV = "6";

const static1x = `/brand/lerta-brand-static.png?v=${BRAND_ASSET_REV}`;
const static2x = `/brand/lerta-brand-static@2x.png?v=${BRAND_ASSET_REV}`;

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
      className={`lerta-brand-logo ${
        isHeader ? "lerta-brand-logo--header" : "lerta-brand-logo--hero"
      } ${className}`.trim()}
    >
      <img
        className="lerta-brand-logo__img-static"
        src={static1x}
        srcSet={`${static1x} 1x, ${static2x} 2x`}
        sizes={isHeader ? "(max-width: 85vw) 504px, 504px" : "(max-width: 94vw) 400px, 400px"}
        alt={isHeader ? "" : "Lerta"}
        aria-hidden={isHeader}
        decoding="async"
        draggable={false}
      />
    </span>
  );
}
