"use client";

import { ListOrdered } from "lucide-react";
import { useState } from "react";
import type { SchoolSettingsResponse } from "@makyschool/shared/types";
import { GradingScaleStep } from "@/components/school-admin/setup/steps/GradingScaleStep";
import {
  SettingsFormFooter,
  SettingsSection,
} from "@/components/school-admin/settings/SettingsFormLayout";
import { apiClient } from "@/lib/api/client";
import { useToast } from "@/providers/ToastProvider";

function toFormValue(settings: SchoolSettingsResponse) {
  const bands = settings.grading_scale.bands;
  if (bands.length === 0) {
    return {
      bands: [
        { label: "Distinction", minScore: 75, maxScore: 100, description: "" },
        { label: "Credit", minScore: 60, maxScore: 74, description: "" },
        { label: "Pass", minScore: 45, maxScore: 59, description: "" },
        { label: "Fail", minScore: 0, maxScore: 44, description: "" },
      ],
    };
  }
  return {
    bands: bands.map((band) => ({
      label: band.label,
      minScore: band.minScore,
      maxScore: band.maxScore,
      description: band.description ?? "",
    })),
  };
}

export function GradingSettingsForm({
  settings,
  onSaved,
}: {
  settings: SchoolSettingsResponse;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [value, setValue] = useState(() => toFormValue(settings));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      await apiClient("/schools/settings/grading-scale", {
        method: "PUT",
        body: value.bands,
      });
      toast.success("Grading scale saved.");
      onSaved();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save grading scale.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <SettingsSection
        icon={ListOrdered}
        title="Score bands"
        description="Define grade labels and score ranges used on report cards and results."
      >
        <GradingScaleStep value={value} onChange={setValue} />
      </SettingsSection>

      {error ? (
        <div className="rounded-lg bg-theme-danger-bg px-3 py-2 text-sm text-theme-danger">{error}</div>
      ) : null}

      <SettingsFormFooter saving={saving} saveLabel="Save grading scale" onSave={() => void handleSave()} />
    </div>
  );
}
