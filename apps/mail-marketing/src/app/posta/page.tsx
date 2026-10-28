import { MarketingPageShell } from "@/components/MarketingPageShell";
import {
  PostaCtaBand,
  PostaFeaturesSection,
  PostaHeroSection,
  PostaStepsSection,
} from "@/components/PostaProductSections";
import { PricingSection } from "../PricingSection";

export default function PostaProductPage() {
  return (
    <MarketingPageShell contentClassName="platform-content--posta">
      <nav className="breadcrumb breadcrumb--premium" aria-label="Breadcrumb">
        <a href="/">Lerta</a>
        <span aria-hidden="true">/</span>
        <span>Posta</span>
      </nav>

      <PostaHeroSection />
      <PostaFeaturesSection />
      <PostaStepsSection />
      <PricingSection />
      <PostaCtaBand />
    </MarketingPageShell>
  );
}
