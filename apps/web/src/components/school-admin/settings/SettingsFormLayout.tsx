"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function SettingsSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-theme bg-theme-surface shadow-theme-card">
      <div className="border-b border-theme bg-theme-raised/30 px-6 py-5">
        <div className="flex items-start gap-3">
          {Icon ? (
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-theme-accent-muted text-theme-accent">
              <Icon className="h-4 w-4" strokeWidth={2.25} />
            </span>
          ) : null}
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-theme-primary">{title}</h3>
            {description ? <p className="mt-1 text-sm leading-relaxed text-theme-muted">{description}</p> : null}
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

export function SettingsFormFooter({
  saving,
  saveLabel,
  onSave,
}: {
  saving: boolean;
  saveLabel: string;
  onSave: () => void;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
      <button
        type="button"
        className="ms-btn-primary min-w-[10rem] shadow-theme-accent"
        disabled={saving}
        onClick={onSave}
      >
        {saving ? "Saving…" : saveLabel}
      </button>
    </div>
  );
}

export function SettingsFieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-5 lg:grid-cols-2">{children}</div>;
}

export function SettingsField({
  label,
  hint,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-medium text-theme-primary">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs leading-relaxed text-theme-muted">{hint}</span> : null}
    </label>
  );
}
