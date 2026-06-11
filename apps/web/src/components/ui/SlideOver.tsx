"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

export function SlideOver({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label="Close panel"
        className="absolute inset-0 bg-[#0F1117]/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        type="button"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="slide-over-title"
        className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-[#252A3A] bg-[#181C27] shadow-2xl shadow-black/50 sm:max-w-lg"
      >
        <header className="shrink-0 border-b border-[#252A3A] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 pr-2">
              <h2 id="slide-over-title" className="text-base font-semibold text-[#F0F2FA]">
                {title}
              </h2>
              {description ? (
                <p className="mt-1.5 text-sm leading-relaxed text-[#8B90A7]">{description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#8B90A7] transition hover:bg-[#252A3A] hover:text-[#F0F2FA]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>

        {footer ? (
          <footer className="shrink-0 border-t border-[#252A3A] bg-[#181C27] px-6 py-4">
            {footer}
          </footer>
        ) : null}
      </aside>
    </div>
  );
}
