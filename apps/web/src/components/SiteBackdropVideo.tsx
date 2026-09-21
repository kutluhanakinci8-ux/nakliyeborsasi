"use client";

import { useEffect, useRef, useState } from "react";

export function SiteBackdropVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [motionOk, setMotionOk] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = (): void => setMotionOk(!media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!motionOk) {
      return;
    }
    const video = videoRef.current;
    if (!video) {
      return;
    }
    void video.play().catch(() => {
      /* autoplay blocked — static gradient fallback remains */
    });
  }, [motionOk]);

  if (!motionOk) {
    return null;
  }

  return (
    <div className="site-backdrop-video-wrap" aria-hidden>
      <video
        ref={videoRef}
        className="site-backdrop-video"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        tabIndex={-1}
      >
        <source src="/media/corridor-bg.mp4" type="video/mp4" />
      </video>
      <div className="site-backdrop-video-scrim" />
    </div>
  );
}
