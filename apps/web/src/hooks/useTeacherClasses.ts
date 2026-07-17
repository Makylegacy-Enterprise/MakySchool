"use client";

import { useMemo } from "react";
import { useApiSWR } from "@/hooks/useApiSWR";
import type { ClassOption, TeacherDetail } from "@/lib/teachers/types";

export function useTeacherClasses() {
  const result = useApiSWR<TeacherDetail>("/schools/teachers/me");

  const classes = useMemo<ClassOption[]>(() => {
    const assignments = result.data?.assignments ?? [];
    const seen = new Map<string, ClassOption>();

    for (const assignment of assignments) {
      if (seen.has(assignment.class_id)) {
        continue;
      }

      seen.set(assignment.class_id, {
        id: assignment.class_id,
        level: assignment.class_name ?? "",
        stream: assignment.stream ?? null,
      });
    }

    return Array.from(seen.values());
  }, [result.data]);

  return {
    ...result,
    data: classes,
  };
}