import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { TestimonialsMarquee } from "@/components/testimonials/TestimonialsMarquee";
import { marketingContainer, sectionY } from "@/lib/layout";

export function TestimonialsSection() {
  return (
    <section className="overflow-hidden border-b border-theme">
      <div className={`${marketingContainer} ${sectionY}`}>
        <ScrollReveal className="max-w-2xl">
          <p className="text-sm font-medium text-theme-accent">Testimonials</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-theme-primary sm:text-3xl lg:text-4xl">
            Trusted by school teams
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-theme-muted sm:text-base">
            Hear from administrators, head teachers, and bursars using MakySchool every day.
          </p>
        </ScrollReveal>
      </div>

      <div className="mt-8 sm:mt-10">
        <TestimonialsMarquee />
      </div>
    </section>
  );
}
