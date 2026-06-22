"use client";

import { useMemo, useState } from "react";
import { UserCheck } from "lucide-react";
import { formatClassLabel } from "@makyschool/shared/constants";
import { apiClient } from "@/lib/api/client";
import { useApiSWR } from "@/hooks/useApiSWR";
import type { ClassOption, StudentListItem } from "@/lib/students/types";
import { useToast } from "@/providers/ToastProvider";

export function ReinstateStudentDialog({
  student,
  onClose,
  onSaved,
}: {
  student: StudentListItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const { data: classes = [] } = useApiSWR<ClassOption[]>("/schools/classes");
  const [classId, setClassId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(() => classes, [classes]);

  if (!student) return null;

  async function handleConfirm() {
    if (!classId) {
      setError("Please select a class to re-enrol this student.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient<{ message: string }>(`/schools/students/${student!.id}/reinstate`, {
        method: "PATCH",
        body: { class_id: classId },
      });
      toast.success(response.data.message);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reinstate student.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-theme-overlay" onClick={onClose} aria-label="Close" />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-theme bg-theme-surface p-6 shadow-theme-panel">
        <UserCheck className="mx-auto h-8 w-8 text-theme-success" />
        <h2 className="mt-4 text-center text-lg font-semibold text-theme-primary">
          Reinstate {student.full_name}?
        </h2>
        <p className="mt-2 text-center text-sm text-theme-muted">
          Select a class to re-enrol this student as active.
        </p>

        <label className="mt-4 block">
          <span className="mb-1 block text-xs text-theme-muted">Class</span>
          <select className="ms-input" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Select a class</option>
            {options.map((item) => (
              <option key={item.id} value={item.id}>
                {formatClassLabel(item.level, item.stream)}
              </option>
            ))}
          </select>
        </label>

        {error ? <p className="mt-3 text-sm text-theme-danger">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="ms-btn-secondary" disabled={loading} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg border border-theme bg-theme-success-bg px-4 py-2 text-sm font-medium text-theme-success hover:opacity-90"
            disabled={loading}
            onClick={() => void handleConfirm()}
          >
            {loading ? "Reinstating…" : "Reinstate student"}
          </button>
        </div>
      </div>
    </div>
  );
}
