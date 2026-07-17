"use client";

import type { TermSettings } from "@makyschool/shared/types";
import { useSchoolSWR } from "@/hooks/useSchoolSWR";

export function useCurrentTerm() {
  return useSchoolSWR<TermSettings | null>("/schools/settings/current-term");
}