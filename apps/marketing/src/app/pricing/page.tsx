import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { CtaSection } from "@/components/sections/CtaSection";
import { PricingPreviewSection } from "@/components/sections/PricingPreviewSection";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Pricing",
  description:
    "MakySchool pricing for primary and secondary schools — School, Campus, and Group packages with onboarding support.",
  path: "/pricing",
});

export default function PricingPage() {
  return (
    <>
      <PageHeader
        eyebrow="Pricing"
        title="Simple plans for growing schools"
        description="Every package includes cloud access, role-based portals, and guided onboarding. Contact us for a quote tailored to your campus."
      />
      <PricingPreviewSection showAllLink={false} />
      <CtaSection />
    </>
  );
}
