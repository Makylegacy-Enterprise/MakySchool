"use client";

import { Hash } from "lucide-react";
import { useMemo, useState } from "react";
import type { LearnerIdMode, SchoolSettingsResponse } from "@makyschool/shared/types";
import {
  SettingsFormFooter,
  SettingsSection,
} from "@/components/school-admin/settings/SettingsFormLayout";
import { apiClient } from "@/lib/api/client";
import { useToast } from "@/providers/ToastProvider";

export function StudentIdSettingsForm({
  settings,
  onSaved,
}: {
  settings: SchoolSettingsResponse;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const defaults = settings.student_ids;
  const [prefix, setPrefix] = useState(defaults.prefix ?? "");
  const [suffixLength, setSuffixLength] = useState(defaults.suffixLength ?? 6);
  const [mode, setMode] = useState<LearnerIdMode>(defaults.mode ?? "sequential");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => {
    const resolvedPrefix = (prefix || "SCH").toUpperCase();
    if (mode === "random") {
      return `${resolvedPrefix}${"8".repeat(suffixLength)}`;
    }
    return `${resolvedPrefix}-${new Date().getFullYear()}-001`;
  }, [prefix, suffixLength, mode]);

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      await apiClient("/schools/settings/student-ids", {
        method: "PATCH",
        body: {
          prefix: prefix.trim().toUpperCase() || null,
          suffixLength,
          mode,
        },
      });
      toast.success("Student ID settings saved.");
      onSaved();
    } catch (err) {
      const fields = (err as Error & { fields?: Record<string, string> }).fields;
      const message =
        fields?.prefix ??
        (err instanceof Error ? err.message : "Could not save student ID settings.");
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <SettingsSection
        icon={Hash}
        title="Number format"
        description="Applied to new student registrations and CSV imports. Existing learner IDs are unchanged."
      >
        <div className="space-y-5">
          <label className="block max-w-md">
            <span className="mb-2 block text-sm font-medium text-theme-primary">ID prefix</span>
            <input
              value={prefix}
              onChange={(event) => setPrefix(event.target.value.toUpperCase())}
              placeholder="e.g. MAK"
              maxLength={8}
              className="ms-input uppercase"
            />
            <span className="mt-1.5 block text-xs text-theme-muted">
              2–8 letters or digits. Leave blank to derive from your school slug.
            </span>
          </label>

          <div>
            <p className="mb-3 text-sm font-medium text-theme-primary">Numbering mode</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                ["sequential", "Sequential", "PREFIX-YEAR-001"],
                ["random", "Random suffix", "PREFIX + random digits"],
              ] as const).map(([value, label, hint]) => (
                <label
                  key={value}
                  className={`flex cursor-pointer flex-col rounded-xl border px-4 py-3.5 transition ${
                    mode === value
                      ? "border-accent-soft bg-theme-accent-muted ring-1 ring-accent-soft"
                      : "border-theme bg-theme-raised hover:border-theme-strong"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-theme-primary">
                    <input
                      type="radio"
                      name="learnerIdMode"
                      className="sr-only"
                      checked={mode === value}
                      onChange={() => setMode(value)}
                    />
                    {label}
                  </span>
                  <span className="mt-1.5 font-mono text-xs text-theme-muted">{hint}</span>
                </label>
              ))}
            </div>
          </div>

          {mode === "random" ? (
            <label className="block max-w-xs">
              <span className="mb-2 block text-sm font-medium text-theme-primary">Random suffix length</span>
              <input
                type="number"
                min={4}
                max={10}
                value={suffixLength}
                onChange={(event) => setSuffixLength(Number(event.target.value))}
                className="ms-input"
              />
            </label>
          ) : null}

          <div className="rounded-xl border border-dashed border-theme bg-theme-page px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-theme-muted">Live preview</p>
            <p className="mt-2 font-mono text-xl font-semibold tracking-wide text-theme-primary">{preview}</p>
          </div>
        </div>
      </SettingsSection>

      {error ? (
        <div className="rounded-lg bg-theme-danger-bg px-3 py-2 text-sm text-theme-danger">{error}</div>
      ) : null}

      <SettingsFormFooter saving={saving} saveLabel="Save student IDs" onSave={() => void handleSave()} />
    </div>
  );
}
