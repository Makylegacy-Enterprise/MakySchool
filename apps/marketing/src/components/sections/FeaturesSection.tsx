import Link from "next/link";
import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { StaggerItem, StaggerReveal } from "@/components/motion/StaggerReveal";
import { MarketingImage } from "@/components/ui/MarketingImage";
import { featureHighlights } from "@/lib/site";
import { marketingContainer, sectionY } from "@/lib/layout";

export function FeaturesSection({ showAllLink = true }: { showAllLink?: boolean }) {
  return (
    <section className="border-b border-theme">
      <div className={`${marketingContainer} ${sectionY}`}>
        <ScrollReveal className="max-w-2xl">
          <p className="text-sm font-medium text-theme-accent">Platform features</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-theme-primary sm:text-3xl lg:text-4xl">
            Everything schools need in one system
          </h2>
          <p className="mt-4 text-base leading-relaxed text-theme-muted">
            From academic structure to fees and role-specific portals — built for how Ugandan schools
            actually operate.
          </p>
        </ScrollReveal>

        <StaggerReveal className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featureHighlights.map((feature) => (
            <StaggerItem key={feature.title} as="article">
              <div className="h-full overflow-hidden rounded-2xl border border-theme bg-theme-surface shadow-theme-card transition hover:-translate-y-0.5 hover:shadow-theme-soft">
                <div className="border-b border-theme bg-theme-bg p-3">
                  <MarketingImage imageKey={feature.imageKey} variant="card" />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-theme-primary">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-theme-muted">{feature.description}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerReveal>

        {showAllLink ? (
          <ScrollReveal className="mt-10" delay={0.1}>
            <Link
              href="/features"
              className="text-sm font-semibold text-theme-accent hover:underline"
            >
              View all features →
            </Link>
          </ScrollReveal>
        ) : null}
      </div>
    </section>
  );
}
