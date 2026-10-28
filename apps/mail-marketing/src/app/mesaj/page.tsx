import { MarketingPageShell } from "@/components/MarketingPageShell";
import {
  MesajChannelsSection,
  MesajCtaBand,
  MesajFeaturesSection,
  MesajHeroSection,
  MesajPlansSection,
  MesajStepsSection,
} from "@/components/MesajProductSections";

export default function MesajProductPage() {
  return (
    <MarketingPageShell contentClassName="platform-content--product-vitrin">
      <nav className="breadcrumb breadcrumb--premium" aria-label="Breadcrumb">
        <a href="/">Lerta</a>
        <span aria-hidden="true">/</span>
        <span>Mesajlaşma</span>
      </nav>

      <MesajHeroSection />
      <MesajChannelsSection />
      <MesajFeaturesSection />
      <MesajStepsSection />
      <MesajPlansSection />
      <MesajCtaBand />
    </MarketingPageShell>
  );
}
