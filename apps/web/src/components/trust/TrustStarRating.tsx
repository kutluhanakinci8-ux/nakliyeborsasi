"use client";

type TrustStarRatingProps = {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: "md" | "lg";
};

export function TrustStarRating({
  value,
  onChange,
  readOnly = false,
  size = "md",
}: TrustStarRatingProps) {
  const className = size === "lg" ? "trust-stars trust-stars--lg" : "trust-stars";

  return (
    <div className={className} role={readOnly ? "img" : "group"} aria-label={`Puan ${value} / 5`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.round(value);
        if (readOnly || !onChange) {
          return (
            <span
              key={star}
              className={filled ? "trust-star trust-star--on" : "trust-star"}
              aria-hidden
            >
              ★
            </span>
          );
        }
        return (
          <button
            key={star}
            type="button"
            className={filled ? "trust-star-btn trust-star-btn--on" : "trust-star-btn"}
            onClick={() => onChange(star)}
            aria-label={`${star} yıldız`}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}
