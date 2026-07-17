"use client";

import { useMemo } from "react";
import type { SchoolSettingsResponse, TermSettings } from "@makyschool/shared/types";
import { useSchoolSWR } from "@/hooks/useSchoolSWR";

export function useCurrentTerm() {
  const result = useSchoolSWR<SchoolSettingsResponse>("/schools/settings");

  const term = useMemo<TermSettings | null>(() => {
    const terms = result.data?.academic_year.terms ?? [];
    return terms.find((item) => item.isCurrent) ?? terms[0] ?? null;
  }, [result.data]);

  return {
    ...result,
    data: term,
  };
}