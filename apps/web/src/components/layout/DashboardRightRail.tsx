"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatClassLabel } from "@makyschool/shared/constants";
import type { ClassWithDetails } from "@makyschool/shared/types";
import { QueryState } from "@makyschool/ui/components/ui/QueryState";
import { SkeletonAttentionList } from "@makyschool/ui/components/ui/Skeleton";
import { cn } from "@makyschool/ui/lib/cn";
import { useSchoolSWR } from "@/hooks/useSchoolSWR";
import { useAuth } from "@/hooks/useAuth";
import { useSchool } from "@/providers/SchoolProvider";

const STORAGE_KEY = "makyschool-dashboard-right-rail";
const RAIL_WIDTH_OPEN = "20rem";
const RAIL_WIDTH_COLLAPSED = "4.5rem";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function getWeekDays(reference = new Date()) {
  const start = new Date(reference);
  const day = start.getDay();
  start.setDate(start.getDate() - day);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function classNeedsAttention(classRow: ClassWithDetails) {
  return (
    classRow.subjects.length === 0 ||
    (classRow.capacity != null && classRow.student_count >= classRow.capacity)
  );
}

function SchoolLogo({
  school,
  fallbackLabel,
  size = "md",
}: {
  school: { logo_url?: string | null; name?: string | null } | null;
  fallbackLabel: string;
  size?: "sm" | "md";
}) {
  const dimension = size === "sm" ? "h-9 w-9 text-xs" : "h-11 w-11 text-sm";

  if (school?.logo_url) {
    return (
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-full border border-theme bg-input",
          dimension,
        )}
      >
        <Image src={school.logo_url} alt="" fill className="object-contain p-1" unoptimized />
      </div>
    );
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-theme-accent-muted font-bold text-theme-accent",
        dimension,
      )}
    >
      {(school?.name ?? fallbackLabel).charAt(0).toUpperCase()}
    </span>
  );
}

function RailIconButton({
  href,
  onClick,
  title,
  children,
  badge,
  tone = "neutral",
}: {
  href?: string;
  onClick?: () => void;
  title: string;
  children: React.ReactNode;
  badge?: number;
  tone?: "neutral" | "warning" | "info";
}) {
  const className = cn(
    "relative flex h-9 w-9 items-center justify-center rounded-lg border border-theme transition hover:border-accent-soft hover:bg-nav-hover",
    tone === "warning" && "badge-warning border-transparent",
    tone === "info" && "badge-info border-transparent",
  );

  const content = (
    <>
      {children}
      {badge && badge > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-theme-danger px-1 text-[10px] font-semibold text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className} title={title} aria-label={title}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={className} title={title} aria-label={title} onClick={onClick}>
      {content}
    </button>
  );
}

export function DashboardRightRail() {
  const { state } = useAuth();
  const { school } = useSchool();
  const today = new Date();
  const weekDays = getWeekDays(today);

  const { data: classes, isLoading, isValidating, error, mutate } =
    useSchoolSWR<ClassWithDetails[]>("/schools/classes");

  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const needsAttention = useMemo(() => (classes ?? []).filter(classNeedsAttention), [classes]);
  const needsAttentionCount = needsAttention.length;

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setOpen(stored === "true");
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || isLoading) return;
    if (localStorage.getItem(STORAGE_KEY) !== null) return;
    setOpen(needsAttentionCount > 0);
  }, [hydrated, isLoading, needsAttentionCount]);

  function toggle() {
    setOpen((current) => {
      const next = !current;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  const displayName = state.user?.name?.split(" ")[0] ?? "Admin";
  const monthLabel = today.toLocaleString("default", { month: "long" });

  return (
    <aside
      className={cn(
        "dashboard-scroll relative h-full shrink-0 overflow-hidden rounded-l-xl border border-theme bg-theme-surface shadow-theme-card transition-[width] duration-300 ease-in-out",
        open ? "overflow-y-auto" : "overflow-hidden",
      )}
      style={{ width: open ? RAIL_WIDTH_OPEN : RAIL_WIDTH_COLLAPSED }}
      aria-label="Dashboard side panel"
      aria-expanded={open}
    >
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "absolute z-10 flex h-7 w-7 items-center justify-center rounded-full border border-theme bg-theme-surface text-theme-muted shadow-theme-card transition hover:bg-nav-hover hover:text-theme-primary",
          open ? "right-3 top-4" : "left-1/2 top-3 -translate-x-1/2",
        )}
        aria-label={open ? "Collapse side panel" : "Expand side panel"}
      >
        {open ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      {!open ? (
        <div className="flex h-full flex-col items-center gap-2 px-1.5 pb-4 pt-12">
          <SchoolLogo school={school} fallbackLabel={displayName} size="sm" />

          <div className="my-1 h-px w-full bg-theme-raised" />

          <RailIconButton title="Open schedule" onClick={toggle}>
            <CalendarDays className="h-4 w-4" />
          </RailIconButton>

          <RailIconButton
            href="/dashboard/classes"
            title="Classes needing attention"
            badge={needsAttentionCount}
            tone={needsAttentionCount > 0 ? "warning" : "neutral"}
          >
            <AlertCircle className="h-4 w-4" />
          </RailIconButton>

          {needsAttention.slice(0, 4).map((classRow) => {
            const label = formatClassLabel(classRow.level, classRow.stream);
            const atCapacity =
              classRow.capacity != null && classRow.student_count >= classRow.capacity;

            return (
              <RailIconButton
                key={classRow.id}
                href="/dashboard/classes"
                title={atCapacity ? `${label}: at capacity` : `${label}: no subjects linked`}
                tone={atCapacity ? "warning" : "info"}
              >
                {atCapacity ? <AlertCircle className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
              </RailIconButton>
            );
          })}
        </div>
      ) : (
        <div className="flex h-full flex-col gap-6 p-5 pt-14">
          <div className="flex items-center justify-between gap-3 pr-8">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-theme-primary">
                {state.user?.name ?? "School admin"}
              </p>
              <p className="truncate text-xs text-theme-muted">{school?.name ?? "Your school"}</p>
            </div>
            <SchoolLogo school={school} fallbackLabel={displayName} />
          </div>

          <section className="ms-card p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-theme-primary">Schedule</h2>
              <span className="text-xs text-theme-muted">{monthLabel}</span>
            </div>
            <div className="mt-4 grid grid-cols-7 gap-1">
              {weekDays.map((date) => {
                const active = isSameDay(date, today);
                return (
                  <div key={date.toISOString()} className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-medium text-theme-muted">
                      {WEEKDAY_LABELS[date.getDay()]}
                    </span>
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                        active
                          ? "bg-theme-accent text-on-accent shadow-theme-accent"
                          : "text-theme-primary"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="min-h-0 flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-theme-primary">Needs attention</h2>
              <Link
                href="/dashboard/classes"
                className="text-xs font-medium text-theme-accent hover:underline"
              >
                View all
              </Link>
            </div>

            <div className="mt-3">
              <QueryState
                isLoading={isLoading}
                isValidating={isValidating}
                error={error}
                data={classes}
                onRetry={() => void mutate()}
                loading={<SkeletonAttentionList rows={3} />}
                isEmpty={() => needsAttentionCount === 0}
                empty={
                  <div className="ms-card p-4 text-sm text-theme-muted">
                    Everything looks good. No classes need action right now.
                  </div>
                }
                showRefreshing={false}
              >
                {() => (
                  <div className="space-y-2">
                    {needsAttention.slice(0, 5).map((classRow) => {
                      const label = formatClassLabel(classRow.level, classRow.stream);
                      const atCapacity =
                        classRow.capacity != null && classRow.student_count >= classRow.capacity;

                      return (
                        <Link
                          key={classRow.id}
                          href="/dashboard/classes"
                          className="ms-card flex items-center gap-3 p-3 transition hover:border-accent-soft"
                        >
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                              atCapacity ? "badge-warning" : "badge-info"
                            }`}
                          >
                            {atCapacity ? (
                              <AlertCircle className="h-4 w-4" />
                            ) : (
                              <BookOpen className="h-4 w-4" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-theme-primary">{label}</p>
                            <p className="truncate text-xs text-theme-muted">
                              {atCapacity
                                ? `At capacity (${classRow.student_count}/${classRow.capacity})`
                                : "No subjects linked yet"}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-theme-muted" />
                        </Link>
                      );
                    })}
                  </div>
                )}
              </QueryState>
            </div>
          </section>
        </div>
      )}
    </aside>
  );
}
