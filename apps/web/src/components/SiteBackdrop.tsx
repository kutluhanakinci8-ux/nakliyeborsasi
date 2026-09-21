import { SiteBackdropVideo } from "./SiteBackdropVideo";

export function SiteBackdrop() {
  return (
    <div className="site-backdrop" aria-hidden>
      <SiteBackdropVideo />
      <div className="site-backdrop-grid" />
      <div className="site-backdrop-glow site-backdrop-glow--sky" />
      <div className="site-backdrop-glow site-backdrop-glow--deep" />
    </div>
  );
}
