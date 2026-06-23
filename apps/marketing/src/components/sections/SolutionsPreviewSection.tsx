import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { StaggerItem, StaggerReveal } from "@/components/motion/StaggerReveal";
import { MarketingImage } from "@/components/ui/MarketingImage";
import { solutions } from "@/lib/site";
import { marketingContainer, sectionY } from "@/lib/layout";

export function SolutionsPreviewSection() {
  return (
    <section className="border-b border-theme">
      <div className={`${marketingContainer} ${sectionY}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <ScrollReveal className="max-w-2xl">
            <p className="text-sm font-medium text-theme-accent">Solutions</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-theme-primary sm:text-3xl lg:text-4xl">
              Built for your school type
            </h2>
            <p className="mt-4 text-base leading-relaxed text-theme-muted">
              Choose the setup that matches your campus — primary, secondary, or fees-focused
              operations.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.08}>
            <Link
              href="/solutions"
              className="inline-flex items-center gap-2 text-sm font-semibold text-theme-accent hover:underline"
            >
              View all solutions
              <ArrowRight className="h-4 w-4" />
            </Link>
          </ScrollReveal>
        </div>

        <StaggerReveal className="mt-12 grid gap-6 lg:grid-cols-3">
          {solutions.map((solution) => (
            <StaggerItem key={solution.slug} as="article">
              <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-theme bg-theme-surface shadow-theme-card transition hover:-translate-y-0.5 hover:shadow-theme-soft">
                <div className="border-b border-theme bg-theme-bg p-3">
                  <MarketingImage imageKey={solution.imageKey} variant="card" />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-lg font-semibold text-theme-primary">{solution.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-theme-muted">
                    {solution.summary}
                  </p>
                  <Link
                    href={`/solutions/${solution.slug}`}
                    className="mt-4 text-sm font-semibold text-theme-accent hover:underline"
                  >
                    Learn more →
                  </Link>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerReveal>
      </div>
    </section>
  );
}
