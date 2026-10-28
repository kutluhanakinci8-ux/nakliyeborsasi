"use client";

/** Master PNG — kanat + LERTA, animasyon yok. */
const BRAND_ASSET_REV = "7";

const static2x = `/brand/lerta-brand-static@2x.png?v=${BRAND_ASSET_REV}`;
const static1x = `/brand/lerta-brand-static.png?v=${BRAND_ASSET_REV}`;

/** Görüntülenen boyut (master crop oranı). */
const LOGO_WIDTH = 610;
const LOGO_HEIGHT = 268;

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
        src={static2x}
        srcSet={`${static1x} ${LOGO_WIDTH}w, ${static2x} ${LOGO_WIDTH * 2}w`}
        sizes={
          isHeader
            ? "(max-width: 85vw) 504px, 504px"
            : "(max-width: 94vw) 400px, 400px"
        }
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        alt={isHeader ? "" : "Lerta"}
        aria-hidden={isHeader}
        decoding="sync"
        draggable={false}
      />
    </span>
  );
}
