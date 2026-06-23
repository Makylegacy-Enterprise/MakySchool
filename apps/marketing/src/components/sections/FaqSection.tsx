import { CircleHelp } from "lucide-react";
import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { StaggerItem, StaggerReveal } from "@/components/motion/StaggerReveal";
import { faqItems } from "@/lib/site";
import { marketingContainer, sectionY } from "@/lib/layout";

export function FaqSection() {
  return (
    <section className="border-b border-theme bg-theme-surface">
      <div className={`${marketingContainer} ${sectionY}`}>
        <ScrollReveal className="max-w-2xl">
          <p className="text-sm font-medium text-theme-accent">FAQ</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-theme-primary sm:text-3xl lg:text-4xl">
            Questions schools ask
          </h2>
        </ScrollReveal>

        <StaggerReveal className="mt-12 divide-y divide-theme overflow-hidden rounded-2xl border border-theme bg-theme-bg">
          {faqItems.map((item) => (
            <StaggerItem key={item.question}>
              <details className="group px-4 py-4 sm:px-6 sm:py-5">
                <summary className="cursor-pointer list-none text-base font-semibold text-theme-primary marker:content-none">
                  <span className="flex items-center justify-between gap-4">
                    <span className="inline-flex items-center gap-3">
                      <CircleHelp className="h-4 w-4 shrink-0 text-theme-accent" />
                      {item.question}
                    </span>
                    <span className="text-theme-faint transition group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 max-w-3xl pl-7 text-sm leading-relaxed text-theme-muted">
                  {item.answer}
                </p>
              </details>
            </StaggerItem>
          ))}
        </StaggerReveal>
      </div>
    </section>
  );
}
