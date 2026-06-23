"use client";

import Link from "next/link";
import { CalendarDays, Mail } from "lucide-react";
import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { bookDemoUrl } from "@/lib/site";
import { marketingContainer, sectionY } from "@/lib/layout";

export function CtaSection() {
  return (
    <section>
      <div className={`${marketingContainer} ${sectionY}`}>
        <ScrollReveal>
          <div className="rounded-2xl border border-theme bg-theme-accent-muted px-5 py-10 text-center shadow-theme-soft sm:rounded-3xl sm:px-8 sm:py-12 lg:px-12">
            <h2 className="text-2xl font-semibold tracking-tight text-theme-primary sm:text-3xl lg:text-4xl">
              Ready to see MakySchool in action?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-theme-muted">
              Book a demo with our team and we will walk you through academics, portals, and fees
              workflows tailored to your school.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
              <Link
                href={bookDemoUrl}
                className="marketing-cta-button inline-flex items-center justify-center gap-2 rounded-full bg-theme-accent px-6 py-3.5 text-sm font-semibold text-on-accent shadow-theme-accent transition hover:bg-theme-accent-hover sm:w-auto sm:px-7"
              >
                <CalendarDays className="h-4 w-4" />
                Book a demo
              </Link>
              <Link
                href="/contact"
                className="marketing-cta-button inline-flex items-center justify-center gap-2 rounded-full border border-theme bg-theme-surface px-6 py-3.5 text-sm font-semibold text-theme-primary transition hover:bg-theme-surface-raised sm:w-auto sm:px-7"
              >
                <Mail className="h-4 w-4" />
                Contact us
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
