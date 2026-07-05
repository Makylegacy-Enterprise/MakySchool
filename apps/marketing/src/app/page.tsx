import { CtaSection } from "@/components/sections/CtaSection";
import { FaqSection } from "@/components/sections/FaqSection";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { HeroSection } from "@/components/sections/HeroSection";
import { HowItWorksSection } from "@/components/sections/HowItWorksSection";
import { PricingPreviewSection } from "@/components/sections/PricingPreviewSection";
import { SolutionsPreviewSection } from "@/components/sections/SolutionsPreviewSection";
import { StatsSection } from "@/components/sections/StatsSection";
import { TestimonialsSection } from "@/components/sections/TestimonialsSection";
import { TrustedBySection } from "@/components/sections/TrustedBySection";
import { JsonLd } from "@/components/seo/JsonLd";
import { faqPageJsonLd } from "@/lib/json-ld";

export default function HomePage() {
  return (
    <>
      <JsonLd data={faqPageJsonLd()} />
      <HeroSection />
      <TrustedBySection />
      <StatsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <SolutionsPreviewSection />
      <PricingPreviewSection />
      <TestimonialsSection />
      <FaqSection />
      <CtaSection />
    </>
  );
}
