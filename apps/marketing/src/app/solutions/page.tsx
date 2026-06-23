import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { MarketingImage } from "@/components/ui/MarketingImage";
import { CtaSection } from "@/components/sections/CtaSection";
import { createPageMetadata } from "@/lib/metadata";
import { solutions } from "@/lib/site";
import { marketingContainer, sectionY } from "@/lib/layout";

export const metadata: Metadata = createPageMetadata({
  title: "Solutions",
  description:
    "MakySchool solutions for primary schools, secondary schools, and fees & bursar operations in Uganda.",
  path: "/solutions",
});

export default function SolutionsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Solutions"
        title="Choose the setup that fits your school"
        description="Whether you run a primary campus, a secondary school, or need a dedicated fees workflow, MakySchool has a focused path to go live."
      />
      <section>
        <div className={`${marketingContainer} grid gap-6 py-10 sm:gap-8 sm:py-16 lg:grid-cols-3`}>
          {solutions.map((solution) => (
            <article
              key={solution.slug}
              className="overflow-hidden rounded-2xl border border-theme bg-theme-surface shadow-theme-card"
            >
              <div className="border-b border-theme bg-theme-bg p-3">
                <MarketingImage imageKey={solution.imageKey} variant="card" />
              </div>
              <div className="p-6">
                <h2 className="text-xl font-semibold text-theme-primary">{solution.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-theme-muted">{solution.description}</p>
                <ul className="mt-4 space-y-2">
                  {solution.bullets.map((bullet) => (
                    <li key={bullet} className="text-sm text-theme-muted">
                      • {bullet}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/solutions/${solution.slug}`}
                  className="mt-6 inline-flex text-sm font-semibold text-theme-accent hover:underline"
                >
                  View solution →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
      <CtaSection />
    </>
  );
}
