import { CalendarDays, LineChart, Map, Users } from "lucide-react";
import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { StaggerItem, StaggerReveal } from "@/components/motion/StaggerReveal";
import { howItWorks } from "@/lib/site";
import { marketingContainer, sectionY } from "@/lib/layout";

const stepIcons = [CalendarDays, Map, Users, LineChart] as const;

export function HowItWorksSection() {
  return (
    <section className="border-b border-theme bg-theme-surface">
      <div className={`${marketingContainer} ${sectionY}`}>
        <ScrollReveal className="max-w-2xl">
          <p className="text-sm font-medium text-theme-accent">How it works</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-theme-primary sm:text-3xl lg:text-4xl">
            Go live in four steps
          </h2>
        </ScrollReveal>

        <StaggerReveal as="ol" className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {howItWorks.map((item, index) => {
            const Icon = stepIcons[index];
            return (
              <StaggerItem key={item.step} as="li">
                <div className="h-full rounded-2xl border border-theme bg-theme-bg p-6 shadow-theme-card">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-theme-accent-muted text-theme-accent">
                      <Icon className="h-5 w-5" />
                    </span>
                    <p className="text-sm font-semibold text-theme-faint">{item.step}</p>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-theme-primary">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-theme-muted">{item.description}</p>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerReveal>
      </div>
    </section>
  );
}
