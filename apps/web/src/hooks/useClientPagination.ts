"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PAGE_SIZE,
  clampPage,
  clampPageSize,
  pageRange,
  slicePage,
  totalPages as calcTotalPages,
} from "@makyschool/shared/constants";

export function useClientPagination<T>({
  items,
  initialPageSize = DEFAULT_PAGE_SIZE,
  resetDeps = [],
}: {
  items: T[];
  initialPageSize?: number;
  resetDeps?: unknown[];
}) {
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(() => clampPageSize(initialPageSize));
  const resetSignature = JSON.stringify(resetDeps);

  const setPage = useCallback((next: number) => {
    setPageState(Math.max(1, Math.floor(next)));
  }, []);

  const setPageSize = useCallback((next: number) => {
    setPageSizeState(clampPageSize(next));
    setPageState(1);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setPageState(1), 0);
    return () => window.clearTimeout(timer);
  }, [resetSignature, items.length, pageSize]);

  const total = items.length;
  const pages = calcTotalPages(total, pageSize);
  const safePage = clampPage(page, total, pageSize);

  const paged = useMemo(
    () => slicePage(items, safePage, pageSize),
    [items, safePage, pageSize],
  );

  const { start: rangeStart, end: rangeEnd } = pageRange(safePage, pageSize, total);

  return {
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages: pages,
    paged,
    rangeStart,
    rangeEnd,
  };
}
