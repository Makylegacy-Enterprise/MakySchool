import { LayoutGrid, Calendar, Wallet, Cloud } from "lucide-react";
import { StaggerItem, StaggerReveal } from "@/components/motion/StaggerReveal";
import { marketingContainer, sectionY } from "@/lib/layout";
import { stats } from "@/lib/site";

const statIcons = [LayoutGrid, Calendar, Wallet, Cloud] as const;

export function StatsSection() {
  return (
    <section className="border-b border-theme bg-theme-surface">
      <div className={`${marketingContainer} py-10 sm:py-12`}>
        <StaggerReveal className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
          {stats.map((stat, index) => {
            const Icon = statIcons[index];
            return (
              <StaggerItem key={stat.label}>
                <div className="rounded-2xl border border-theme bg-theme-bg px-4 py-5 text-center shadow-theme-card transition hover:-translate-y-0.5 hover:shadow-theme-soft sm:px-5 sm:py-6">
                  <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-theme-accent-muted text-theme-accent sm:h-10 sm:w-10">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </span>
                  <p className="mt-3 text-2xl font-semibold tracking-tight text-theme-primary sm:mt-4 sm:text-3xl">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-sm text-theme-muted">{stat.label}</p>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerReveal>
      </div>
    </section>
  );
}
