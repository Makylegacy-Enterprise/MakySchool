/** System-wide list pagination rules (1-based pages). */

export const DEFAULT_PAGE_SIZE = 25;

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

export const MAX_PAGE_SIZE = 100;

export function clampPageSize(value: number | undefined | null, fallback = DEFAULT_PAGE_SIZE): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : fallback;
  if (n < 1) return fallback;
  return Math.min(n, MAX_PAGE_SIZE);
}

export function totalPages(total: number, pageSize: number): number {
  const size = clampPageSize(pageSize);
  if (total <= 0) return 1;
  return Math.max(1, Math.ceil(total / size));
}

export function clampPage(page: number, total: number, pageSize: number): number {
  const pages = totalPages(total, pageSize);
  const p = Number.isFinite(page) ? Math.floor(page) : 1;
  if (p < 1) return 1;
  return Math.min(p, pages);
}

/** Inclusive 1-based range for UI summaries. */
export function pageRange(
  page: number,
  pageSize: number,
  total: number,
): { start: number; end: number } {
  if (total <= 0) return { start: 0, end: 0 };
  const size = clampPageSize(pageSize);
  const safe = clampPage(page, total, size);
  const start = (safe - 1) * size + 1;
  const end = Math.min(safe * size, total);
  return { start, end };
}

export function slicePage<T>(items: T[], page: number, pageSize: number): T[] {
  const size = clampPageSize(pageSize);
  const safe = clampPage(page, items.length, size);
  const start = (safe - 1) * size;
  return items.slice(start, start + size);
}

export function paginationSummary(
  page: number,
  pageSize: number,
  total: number,
  noun?: string,
): string {
  const { start, end } = pageRange(page, pageSize, total);
  const label = noun ? ` ${noun}` : "";
  if (total === 0) return `Showing 0 of 0${label}`;
  return `Showing ${start}–${end} of ${total}${label}`;
}
