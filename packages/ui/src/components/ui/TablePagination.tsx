"use client";

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

function totalPages(total: number, pageSize: number): number {
  if (total <= 0) return 1;
  return Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
}

function pageRange(page: number, pageSize: number, total: number): { start: number; end: number } {
  if (total <= 0) return { start: 0, end: 0 };
  const safePage = Math.min(Math.max(1, page), totalPages(total, pageSize));
  const start = (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, total);
  return { start, end };
}

export function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  noun,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  /** @deprecated Prefer page/pageSize/total props */
  summary,
  onPrevious,
  onNext,
  previousDisabled,
  nextDisabled,
}: {
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  noun?: string;
  pageSizeOptions?: readonly number[];
  summary?: string;
  onPrevious?: () => void;
  onNext?: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
}) {
  const useModern =
    typeof page === "number" &&
    typeof pageSize === "number" &&
    typeof total === "number" &&
    typeof onPageChange === "function";

  if (useModern) {
    if (total <= pageSize && total > 0 && !onPageSizeChange) {
      return null;
    }
    if (total === 0) {
      return null;
    }

    const pages = totalPages(total, pageSize);
    const safePage = Math.min(Math.max(1, page), pages);
    const { start, end } = pageRange(safePage, pageSize, total);
    const label = noun ? ` ${noun}` : "";
    const text = `Showing ${start}–${end} of ${total}${label}`;

    return (
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-theme-muted">
        <p>
          Showing{" "}
          <span className="font-medium text-theme-primary">
            {start}–{end}
          </span>{" "}
          of <span className="font-medium text-theme-primary">{total}</span>
          {label}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {onPageSizeChange ? (
            <label className="flex items-center gap-2 text-xs text-theme-muted">
              <span className="sr-only">Rows per page</span>
              <span className="hidden sm:inline">Rows</span>
              <select
                className="ms-input py-1.5 text-sm"
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button
            type="button"
            className="ms-btn-secondary"
            disabled={safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
          >
            Previous
          </button>
          <span className="px-1 tabular-nums text-theme-muted">
            {safePage} / {pages}
          </span>
          <button
            type="button"
            className="ms-btn-secondary"
            disabled={safePage >= pages}
            onClick={() => onPageChange(safePage + 1)}
          >
            Next
          </button>
        </div>
        <span className="sr-only">{text}</span>
      </div>
    );
  }

  if (!summary || !onPrevious || !onNext) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-theme-muted">
      <p>{summary}</p>
      <div className="flex gap-2">
        <button type="button" className="ms-btn-secondary" disabled={previousDisabled} onClick={onPrevious}>
          Previous
        </button>
        <button type="button" className="ms-btn-secondary" disabled={nextDisabled} onClick={onNext}>
          Next
        </button>
      </div>
    </div>
  );
}
