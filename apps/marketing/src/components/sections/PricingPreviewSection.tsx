import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { StaggerItem, StaggerReveal } from "@/components/motion/StaggerReveal";
import { bookDemoUrl, pricingTiers } from "@/lib/site";
import { marketingContainer, sectionY } from "@/lib/layout";

export function PricingPreviewSection({ showAllLink = true }: { showAllLink?: boolean }) {
  return (
    <section className="border-b border-theme bg-theme-surface">
      <div className={`${marketingContainer} ${sectionY}`}>
        <ScrollReveal className="max-w-2xl">
          <p className="text-sm font-medium text-theme-accent">Pricing</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-theme-primary sm:text-3xl lg:text-4xl">
            Plans for schools of every size
          </h2>
          <p className="mt-4 text-base leading-relaxed text-theme-muted">
            Transparent school pricing with onboarding support. Contact us for a package tailored to
            your campus.
          </p>
        </ScrollReveal>

        <StaggerReveal className="mt-12 grid gap-6 lg:grid-cols-3">
          {pricingTiers.map((tier) => (
            <StaggerItem key={tier.name} as="article">
              <div
                className={[
                  "flex h-full flex-col rounded-2xl border p-6 shadow-theme-card transition hover:-translate-y-0.5",
                  tier.highlighted
                    ? "border-theme-accent bg-theme-accent-muted hover:shadow-theme-soft"
                    : "border-theme bg-theme-bg hover:shadow-theme-card",
                ].join(" ")}
              >
                {tier.highlighted ? (
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-theme-accent">
                    <Sparkles className="h-3.5 w-3.5" />
                    Recommended
                  </p>
                ) : null}
                <h3 className="mt-2 text-xl font-semibold text-theme-primary">{tier.name}</h3>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-theme-primary">
                  {tier.price}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-theme-muted">{tier.description}</p>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-theme-muted">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-theme-accent" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={bookDemoUrl}
                  className={[
                    "mt-8 inline-flex justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition",
                    tier.highlighted
                      ? "bg-theme-accent text-on-accent shadow-theme-accent hover:bg-theme-accent-hover"
                      : "border border-theme bg-theme-surface text-theme-primary hover:bg-theme-surface-raised",
                  ].join(" ")}
                >
                  {tier.cta}
                </Link>
              </div>
            </StaggerItem>
          ))}
        </StaggerReveal>

        {showAllLink ? (
          <ScrollReveal className="mt-10" delay={0.1}>
            <Link href="/pricing" className="text-sm font-semibold text-theme-accent hover:underline">
              Compare plans in detail →
            </Link>
          </ScrollReveal>
        ) : null}
      </div>
    </section>
  );
}
