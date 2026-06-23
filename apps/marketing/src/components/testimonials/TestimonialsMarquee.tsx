"use client";

import { useEffect, useRef } from "react";
import { Quote, Star } from "lucide-react";
import { motion, useAnimationFrame, useMotionValue, useReducedMotion } from "motion/react";
import { cn } from "@makyschool/ui/lib/cn";
import { testimonials } from "@/lib/site";

type Testimonial = (typeof testimonials)[number];

const MARQUEE_SPEED = 48;

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function TestimonialCard({ item }: { item: Testimonial }) {
  return (
    <motion.figure
      className={cn(
        "group relative w-[min(82vw,300px)] shrink-0 rounded-2xl border border-theme bg-theme-surface p-5 shadow-theme-card",
        "transition-[border-color,box-shadow] duration-300",
        "hover:border-theme-accent hover:shadow-theme-soft sm:w-[320px] sm:p-6",
      )}
      whileHover={{ y: -6, scale: 1.015 }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
    >
      <div
        className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-theme-accent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:inset-x-6"
        aria-hidden
      />

      <div className="flex items-start justify-between gap-3">
        <Quote className="h-7 w-7 shrink-0 text-theme-accent/35 transition-colors group-hover:text-theme-accent/60" />
        <div className="flex gap-0.5" aria-hidden>
          {Array.from({ length: 5 }).map((_, index) => (
            <Star
              key={index}
              className="h-3.5 w-3.5 fill-theme-accent text-theme-accent"
              strokeWidth={0}
            />
          ))}
        </div>
      </div>

      <blockquote className="mt-4 text-sm leading-relaxed text-theme-primary">
        &ldquo;{item.quote}&rdquo;
      </blockquote>

      <figcaption className="mt-5 flex items-center gap-3 border-t border-theme pt-4">
        <span className="brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-on-accent shadow-theme-accent">
          {getInitials(item.name)}
        </span>
        <span className="min-w-0">
          <p className="truncate text-sm font-semibold text-theme-primary">{item.name}</p>
          <p className="truncate text-xs text-theme-muted">
            {item.role} · {item.location}
          </p>
        </span>
      </figcaption>
    </motion.figure>
  );
}

export function TestimonialsMarquee() {
  const reduceMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const x = useMotionValue(0);
  const track = [...testimonials, ...testimonials];

  useAnimationFrame((_, delta) => {
    if (pausedRef.current || reduceMotion) {
      return;
    }

    const node = trackRef.current;
    if (!node) {
      return;
    }

    const half = node.scrollWidth / 2;
    if (half <= 0) {
      return;
    }

    const next = x.get() - (MARQUEE_SPEED * delta) / 1000;
    x.set(next <= -half ? 0 : next);
  });

  useEffect(() => {
    if (!reduceMotion) {
      return;
    }
    x.set(0);
  }, [reduceMotion, x]);

  const pause = () => {
    pausedRef.current = true;
  };

  const play = () => {
    pausedRef.current = false;
  };

  if (reduceMotion) {
    return (
      <div className="flex gap-4 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
        {testimonials.map((item) => (
          <TestimonialCard key={item.name} item={item} />
        ))}
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden py-1"
      onMouseEnter={pause}
      onMouseLeave={play}
      onTouchStart={pause}
      onTouchEnd={play}
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-theme-bg to-transparent sm:w-20"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-theme-bg to-transparent sm:w-20"
        aria-hidden
      />

      <motion.div
        ref={trackRef}
        style={{ x }}
        className="flex w-max gap-4 pl-4 sm:gap-5 sm:pl-6"
      >
        {track.map((item, index) => (
          <TestimonialCard key={`${item.name}-${index}`} item={item} />
        ))}
      </motion.div>
    </div>
  );
}
