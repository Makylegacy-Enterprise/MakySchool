"use client";

import { motion } from "motion/react";
import { marketingContainer } from "@/lib/layout";

const trustedSchools = [
  "Primary Schools",
  "Secondary Schools",
  "Theology Schools",
  "International Schools",
  "Day Schools",
  "Boarding Schools",
  "Mixed Schools",
  "Single-Sex Schools",
];

export function TrustedBySection() {
  return (
    <section className="overflow-hidden border-b border-theme bg-theme-surface-raised py-12">
      <div className={`${marketingContainer} flex flex-col items-center`}>
        <p className="text-sm font-semibold uppercase tracking-wider text-theme-muted">
          Trusted by forward-thinking schools in Uganda
        </p>

        <div className="relative mt-8 flex w-full overflow-hidden">
          {/* Fade overlays for the edges */}
          <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-24 bg-gradient-to-r from-theme-surface-raised to-transparent" />
          <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-24 bg-gradient-to-l from-theme-surface-raised to-transparent" />

          {/* Infinite marquee animation */}
          <motion.div
            className="flex min-w-full flex-shrink-0 items-center justify-around gap-12 pr-12"
            animate={{ x: ["0%", "-100%"] }}
            transition={{
              repeat: Infinity,
              repeatType: "loop",
              duration: 35,
              ease: "linear",
            }}
          >
            {[...trustedSchools, ...trustedSchools, ...trustedSchools].map((school, i) => (
              <span
                key={`${school}-${i}`}
                className="whitespace-nowrap text-xl font-bold text-theme-text-faint transition-colors hover:text-theme-primary dark:text-theme-text-muted dark:hover:text-theme-text-primary"
              >
                {school}
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
