import {
  countryFlagEmoji,
  countryLabelTr,
  normalizeCountryCode,
} from "../lib/countryDisplay";

type CountryFlagProps = {
  code: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
};

export function CountryFlag({
  code,
  size = "md",
  showLabel = false,
  className = "",
}: CountryFlagProps) {
  const normalized = normalizeCountryCode(code);
  if (!normalized) {
    return null;
  }
  const emoji = countryFlagEmoji(normalized);
  const label = countryLabelTr(normalized);

  return (
    <span
      className={["country-flag", `country-flag--${size}`, className]
        .filter(Boolean)
        .join(" ")}
      title={label}
      role="img"
      aria-label={label}
    >
      <span className="country-flag-emoji" aria-hidden>{emoji}</span>
      {showLabel ? <span className="country-flag-label">{label}</span> : null}
    </span>
  );
}
