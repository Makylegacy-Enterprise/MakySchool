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
          <p className="text-sm font-semibold tracking-wide uppercase text-theme-accent">Platform features</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-theme-primary to-theme-muted">
            Everything schools need in one unified system
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-theme-muted">
            From academic structure to fees and role-specific portals — built for how Ugandan schools
            actually operate.
          </p>
        </ScrollReveal>

        <StaggerReveal className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {featureHighlights.map((feature) => (
            <StaggerItem key={feature.title} as="article">
              <div className="group h-full overflow-hidden rounded-3xl border border-white/20 bg-white/40 shadow-xl backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:bg-white/60 dark:border-white/10 dark:bg-black/40 dark:hover:bg-black/60">
                <div className="border-b border-theme/50 bg-theme-surface/50 p-2">
                  <div className="overflow-hidden rounded-xl ring-1 ring-black/5 dark:ring-white/10">
                    <MarketingImage imageKey={feature.imageKey} variant="card" />
                  </div>
                </div>
                <div className="p-8">
                  <h3 className="text-xl font-bold text-theme-primary transition-colors group-hover:text-theme-accent">{feature.title}</h3>
                  <p className="mt-3 text-base leading-relaxed text-theme-muted">{feature.description}</p>
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
