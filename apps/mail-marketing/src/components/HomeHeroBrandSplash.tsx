"use client";

import { useEffect, useState } from "react";

const SLOGANS = [
  "%100 Yerli",
  "Yeni Neslin Haberleşme Sistemi",
  "Küresel Posta ve Mesajlaşma Servisi",
] as const;

const ROTATE_MS = 3500;
const FADE_MS = 800;

export function HomeHeroBrandSplash() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((current) => (current + 1) % SLOGANS.length);
        setVisible(true);
      }, FADE_MS);
    }, ROTATE_MS);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div
      className="lerta-hero-brand"
      aria-labelledby="lerta-hero-brand-title"
    >
      <div className="lerta-hero-brand__logo-wrap">
        <span className="lerta-hero-brand__logo-mark" aria-hidden="true">
          L
        </span>
      </div>
      <div className="lerta-hero-brand__text">
        <p id="lerta-hero-brand-title" className="lerta-hero-brand__wordmark">
          Lerta
        </p>
        <p
          className={
            visible
              ? "lerta-hero-brand__tagline is-active"
              : "lerta-hero-brand__tagline"
          }
          aria-live="polite"
        >
          {SLOGANS[index]}
        </p>
      </div>
    </div>
  );
}
