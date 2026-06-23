"use client";

import { motion, useReducedMotion } from "motion/react";
import { containerStagger, fadeUp, viewport } from "@/lib/motion";
import { cn } from "@makyschool/ui/lib/cn";

type StaggerRevealProps = {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "ul" | "ol";
};

export function StaggerReveal({ children, className, as = "div" }: StaggerRevealProps) {
  const reduceMotion = useReducedMotion();
  const Component = motion[as];

  if (reduceMotion) {
    const Static = as;
    return <Static className={className}>{children}</Static>;
  }

  return (
    <Component
      className={className}
      variants={containerStagger}
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
    >
      {children}
    </Component>
  );
}

type StaggerItemProps = {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "li" | "article" | "figure";
};

export function StaggerItem({ children, className, as = "div" }: StaggerItemProps) {
  const reduceMotion = useReducedMotion();
  const Component = motion[as];

  if (reduceMotion) {
    const Static = as;
    return <Static className={className}>{children}</Static>;
  }

  return (
    <Component className={cn(className)} variants={fadeUp}>
      {children}
    </Component>
  );
}
