"use client";

/** Kullanıcının şeffaf arka planlı PNG’si (kanat + LERTA, tek dosya). */
const LOGO_1X = "/brand/lerta-brand-logo-transparent@1x.png?v=9";
const LOGO_2X = "/brand/lerta-brand-logo-transparent.png?v=9";

type Props = {
  variant?: "header" | "hero" | "footer";
  className?: string;
};

export function LertaBrandLogoVideo({
  variant = "hero",
  className = "",
}: Props) {
  const isHeader = variant === "header";
  const isFooter = variant === "footer";

  const wrapperVariant = isHeader
    ? "lerta-logo-wrapper--header"
    : isFooter
      ? "lerta-logo-wrapper--footer"
      : "lerta-logo-wrapper--hero";

  return (
    <div
      className={`lerta-logo-wrapper ${wrapperVariant} ${className}`.trim()}
      aria-hidden={isHeader}
    >
      <img
        className="lerta-brand-logo-img"
        src={LOGO_2X}
        srcSet={`${LOGO_1X} 458w, ${LOGO_2X} 916w`}
        sizes={
          isHeader
            ? "(max-width: 85vw) 200px, 200px"
            : isFooter
              ? "(max-width: 85vw) 240px, 240px"
              : "(max-width: 85vw) 320px, 320px"
        }
        width={916}
        height={772}
        alt={isHeader ? "" : "Lerta"}
        draggable={false}
        decoding="sync"
      />
    </div>
  );
}
