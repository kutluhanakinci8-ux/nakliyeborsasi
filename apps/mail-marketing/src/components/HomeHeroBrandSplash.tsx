"use client";

import { useEffect, useState } from "react";

const HERO_VIDEO_SRC = "/brand/lerta-hero-animation.mp4";
const HERO_POSTER_SRC = "/brand/lerta-hero-poster.jpg";

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
    <div className="lerta-hero-brand" aria-label="Lerta marka tanıtımı">
      <div className="lerta-hero-brand__logo-wrap">
        <video
          className="lerta-hero-brand__video"
          src={HERO_VIDEO_SRC}
          poster={HERO_POSTER_SRC}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-label="Lerta altın kanat logosu animasyonu"
        />
      </div>
      <div className="lerta-hero-brand__text">
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
