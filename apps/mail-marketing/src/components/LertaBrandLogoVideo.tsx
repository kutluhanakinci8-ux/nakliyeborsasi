"use client";

type Props = {
  variant?: "header" | "hero";
  className?: string;
};

/** Kullanıcı kaynak HTML — vektör kanat + LERTA, şeffaf zemin. */
export function LertaBrandLogoVideo({
  variant = "hero",
  className = "",
}: Props) {
  const isHeader = variant === "header";

  return (
    <div
      className={`lerta-logo-mark ${
        isHeader ? "lerta-logo-mark--header" : "lerta-logo-mark--hero"
      } ${className}`.trim()}
      aria-hidden={isHeader}
    >
      <svg
        className="lerta-logo-mark__icon"
        viewBox="0 0 400 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <g
          stroke="#D4AF37"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M 50 175 C 60 100, 160 60, 280 70 C 230 100, 180 115, 120 125 C 200 100, 260 90, 275 100 C 210 125, 170 145, 105 160 C 190 125, 260 120, 275 130 C 220 150, 160 170, 95 180 Z" />
          <path d="M 280 70 C 260 110, 230 150, 180 175 C 220 145, 255 125, 270 140 C 240 160, 200 180, 155 190 C 190 170, 230 155, 240 168 C 210 182, 170 195, 135 200" />
          <rect
            x={110}
            y={140}
            width={70}
            height={48}
            rx={4}
            transform="rotate(-12 145 164)"
            fill="none"
            strokeWidth={3.5}
          />
          <path
            d="M 112 142 L 143 166 L 179 133"
            transform="rotate(-12 145 164)"
            fill="none"
            strokeWidth={3.5}
          />
          <path d="M 185 145 A 18 18 0 0 1 188 172" strokeWidth={3.5} />
          <path d="M 197 136 A 28 28 0 0 1 202 180" strokeWidth={3.5} />
          <path d="M 210 126 A 40 40 0 0 1 217 188" strokeWidth={3.5} />
        </g>
      </svg>
      <span className="lerta-logo-mark__text">LERTA</span>
    </div>
  );
}
