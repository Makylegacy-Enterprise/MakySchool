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
            className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl lg:text-[4rem] lg:leading-[1.1] text-transparent bg-clip-text bg-gradient-to-r from-theme-primary via-theme-primary to-theme-muted"
          >
            Run your school with absolute clarity
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="mt-6 max-w-2xl text-lg leading-relaxed text-theme-muted sm:text-xl"
          >
            {siteConfig.description}
          </motion.p>

          <motion.div variants={scaleIn} className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              href={bookDemoUrl}
              className="marketing-cta-button group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-theme-primary px-8 py-4 text-sm font-semibold text-theme-surface shadow-theme-soft transition-all hover:scale-[1.02] hover:bg-theme-primary/90 sm:w-auto"
            >
              <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-100%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(100%)]">
                <div className="relative h-full w-8 bg-white/20" />
              </div>
              <CalendarDays className="h-4 w-4" />
              Book a demo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/contact"
              className="marketing-cta-button inline-flex items-center justify-center gap-2 rounded-full border border-theme-border-strong bg-white/50 px-8 py-4 text-sm font-semibold text-theme-primary backdrop-blur-md transition-all hover:bg-theme-surface hover:shadow-theme-soft sm:w-auto dark:bg-black/50 dark:hover:bg-theme-surface"
            >
              <Mail className="h-4 w-4" />
              Contact sales
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
          initial={{ opacity: 0, y: reduceMotion ? 0 : 40, rotateX: reduceMotion ? 0 : 10 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.8, delay: reduceMotion ? 0 : 0.2, ease: easeOutExpo }}
          style={{ perspective: "1000px" }}
          className="order-1 rounded-2xl border border-white/20 bg-white/40 p-2 shadow-2xl backdrop-blur-xl sm:p-4 lg:order-2 dark:border-white/10 dark:bg-black/40"
        >
          <div className="overflow-hidden rounded-xl border border-theme-border/50 bg-theme-surface ring-1 ring-white/50 dark:ring-white/10">
            <MarketingImage imageKey="hero" priority variant="hero" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
