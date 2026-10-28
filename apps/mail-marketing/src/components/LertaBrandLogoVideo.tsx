"use client";

const ICON_1X = "/brand/lerta-brand-icon.png?v=8";
const ICON_2X = "/brand/lerta-brand-icon@2x.png?v=8";

type Props = {
  variant?: "header" | "hero";
  className?: string;
};

/** Kullanıcı HTML yapısı; ikon = net referans PNG, metin = Montserrat LERTA. */
export function LertaBrandLogoVideo({
  variant = "hero",
  className = "",
}: Props) {
  const isHeader = variant === "header";

  return (
    <div
      className={`lerta-logo-wrapper ${
        isHeader ? "lerta-logo-wrapper--header" : "lerta-logo-wrapper--hero"
      } ${className}`.trim()}
      aria-hidden={isHeader}
    >
      <img
        className="lerta-svg-icon"
        src={ICON_2X}
        srcSet={`${ICON_1X} 560w, ${ICON_2X} 1120w`}
        sizes="(max-width: 85vw) 320px, 320px"
        width={560}
        height={188}
        alt=""
        draggable={false}
        decoding="sync"
      />
      <div className="lerta-text">LERTA</div>
    </div>
  );
}
