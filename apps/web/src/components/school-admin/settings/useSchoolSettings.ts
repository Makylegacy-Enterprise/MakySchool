"use client";

import { useCallback, useEffect, useState } from "react";
import type { SchoolSettingsResponse } from "@makyschool/shared/types";
import { apiClient } from "@/lib/api/client";

export function useSchoolSettings() {
  const [settings, setSettings] = useState<SchoolSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient<SchoolSettingsResponse>("/schools/settings");
      setSettings(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { settings, loading, error, reload };
}
