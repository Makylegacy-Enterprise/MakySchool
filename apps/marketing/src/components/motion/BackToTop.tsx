"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion, useScroll } from "motion/react";
import { cn } from "@makyschool/ui/lib/cn";

export function BackToTop() {
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    return scrollY.on("change", (value) => {
      setVisible(value > 480);
    });
  }, [scrollY]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.92 }}
          transition={{ duration: 0.25 }}
          onClick={scrollToTop}
          aria-label="Back to top"
          className={cn(
            "fixed bottom-4 right-4 z-50 flex h-10 w-10 items-center justify-center sm:bottom-6 sm:right-6 sm:h-11 sm:w-11",
            "rounded-full border border-theme bg-theme-surface text-theme-accent shadow-theme-panel",
            "transition hover:bg-theme-accent-muted hover:text-theme-accent",
          )}
        >
          <ArrowUp className="h-4 w-4" />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
