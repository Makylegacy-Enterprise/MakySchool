import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { CtaSection } from "@/components/sections/CtaSection";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Features",
  description:
    "Explore MakySchool features — classes, academics, teacher and learner portals, fees management, bursar workflows, and role-based access.",
  path: "/features",
});

export default function FeaturesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Features"
        title="A complete toolkit for school operations"
        description="MakySchool brings academic structure, staff portals, learner access, and fees management into one platform designed for Ugandan schools."
      />
      <FeaturesSection showAllLink={false} />
      <CtaSection />
    </>
  );
}
