import { LertaBrandLogoVideo } from "./LertaBrandLogoVideo";

/** Hero: yalnızca statik logo (slogan metinleri şimdilik kapalı). */
export function HomeHeroBrandSplash() {
  return (
    <div className="lerta-hero-brand" aria-label="Lerta markası">
      <LertaBrandLogoVideo variant="hero" />
    </div>
  );
}
