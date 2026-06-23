"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Mail,
  Sparkles,
  Wallet,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { MarketingImage } from "@/components/ui/MarketingImage";
import { containerStagger, easeOutExpo, fadeUp, scaleIn } from "@/lib/motion";
import { marketingContainer } from "@/lib/layout";
import { bookDemoUrl, siteConfig } from "@/lib/site";

const heroPills = [
  { label: "Classes & streams", icon: BookOpen },
  { label: "Fees & bursar", icon: Wallet },
  { label: "Teacher portals", icon: GraduationCap },
  { label: "Learner access", icon: Sparkles },
] as const;

export function HeroSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden border-b border-theme">
      <div
        className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full auth-brand-orb-a blur-3xl"
        aria-hidden
      />
      <div className={`${marketingContainer} grid items-center gap-8 py-12 sm:gap-10 sm:py-16 lg:grid-cols-2 lg:gap-12 lg:py-24`}>
        <motion.div
          className="order-2 max-w-xl lg:order-1"
          variants={containerStagger}
          initial="hidden"
          animate="visible"
        >
          <motion.p
            variants={fadeUp}
            className="inline-flex items-center gap-2 text-sm font-medium text-theme-accent"
          >
            <Sparkles className="h-4 w-4" />
            School management platform
          </motion.p>
          <motion.h1
            variants={fadeUp}
            className="mt-3 text-3xl font-semibold tracking-tight text-theme-primary sm:text-4xl sm:leading-tight lg:text-[3.25rem] lg:leading-[1.1]"
          >
            Run your school with clarity
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="mt-4 text-base leading-relaxed text-theme-muted sm:text-lg"
          >
            {siteConfig.description}
          </motion.p>

          <motion.div variants={scaleIn} className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href={bookDemoUrl}
              className="marketing-cta-button inline-flex items-center justify-center gap-2 rounded-full bg-theme-accent px-6 py-3.5 text-sm font-semibold text-on-accent shadow-theme-accent transition hover:bg-theme-accent-hover sm:w-auto sm:px-7"
            >
              <CalendarDays className="h-4 w-4" />
              Book a demo
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="marketing-cta-button inline-flex items-center justify-center gap-2 rounded-full border border-theme bg-theme-surface px-6 py-3.5 text-sm font-semibold text-theme-primary transition hover:bg-theme-surface-raised sm:w-auto sm:px-7"
            >
              <Mail className="h-4 w-4" />
              Contact us
            </Link>
          </motion.div>

          <motion.ul
            className="mt-8 flex flex-wrap gap-2"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.05, delayChildren: 0.3 } },
            }}
          >
            {heroPills.map((pill) => {
              const Icon = pill.icon;
              return (
                <motion.li
                  key={pill.label}
                  variants={fadeUp}
                  className="inline-flex items-center gap-1.5 rounded-full border border-theme bg-theme-surface px-3.5 py-1.5 text-xs font-medium text-theme-muted shadow-theme-card"
                >
                  <Icon className="h-3.5 w-3.5 text-theme-accent" />
                  {pill.label}
                </motion.li>
              );
            })}
          </motion.ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: reduceMotion ? 0 : 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.65, delay: reduceMotion ? 0 : 0.12, ease: easeOutExpo }}
          className="order-1 rounded-2xl border border-theme bg-theme-surface p-2 shadow-theme-soft sm:p-3 lg:order-2"
        >
          <MarketingImage imageKey="hero" priority variant="hero" />
        </motion.div>
      </div>
    </section>
  );
}
