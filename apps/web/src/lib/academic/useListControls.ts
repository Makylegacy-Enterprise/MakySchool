"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PAGE_SIZE,
  clampPage,
  pageRange,
  slicePage,
  totalPages as calcTotalPages,
} from "@makyschool/shared/constants";

export function useListControls<T>({
  items,
  pageSize = DEFAULT_PAGE_SIZE,
  filterFn,
  resetDeps = [],
}: {
  items: T[];
  pageSize?: number;
  filterFn: (item: T, query: string) => boolean;
  resetDeps?: unknown[];
}) {
  const [query, setQueryState] = useState("");
  const [page, setPage] = useState(1);
  const resetSignature = JSON.stringify(resetDeps);

  const setQuery = useCallback((value: string) => {
    setQueryState(value);
    setPage(1);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setPage(1), 0);
    return () => window.clearTimeout(timer);
  }, [resetSignature]);

  const filtered = useMemo(
    () => items.filter((item) => filterFn(item, query.trim().toLowerCase())),
    [items, query, filterFn],
  );

  const pages = calcTotalPages(filtered.length, pageSize);
  const safePage = clampPage(page, filtered.length, pageSize);

  const paged = useMemo(
    () => slicePage(filtered, safePage, pageSize),
    [filtered, safePage, pageSize],
  );

  const { start: rangeStart, end: rangeEnd } = pageRange(safePage, pageSize, filtered.length);

  return {
    query,
    setQuery,
    page: safePage,
    setPage,
    totalPages: pages,
    paged,
    filteredCount: filtered.length,
    totalCount: items.length,
    rangeStart,
    rangeEnd,
    pageSize,
    hasFilters: query.trim().length > 0,
    clearFilters: () => setQuery(""),
  };
}
