"use client";

import { motion, useReducedMotion } from "motion/react";
import { marketingContainer } from "@/lib/layout";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
};

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      className="border-b border-theme bg-theme-surface"
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <div className={`${marketingContainer} py-10 sm:py-14 lg:py-16`}>
        {eyebrow ? (
          <p className="text-sm font-medium text-theme-accent">{eyebrow}</p>
        ) : null}
        <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-theme-primary sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-theme-muted sm:mt-4 sm:text-base lg:text-lg">
          {description}
        </p>
      </div>
    </motion.section>
  );
}
