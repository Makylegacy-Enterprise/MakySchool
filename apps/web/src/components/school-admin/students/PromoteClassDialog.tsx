"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { formatClassLabel } from "@makyschool/shared/constants";
import { apiClient } from "@/lib/api/client";
import { useApiSWR } from "@/hooks/useApiSWR";
import type { ClassOption, StudentsListResponse } from "@/lib/students/types";
import { useToast } from "@/providers/ToastProvider";

export function PromoteClassDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const { data: classes = [] } = useApiSWR<ClassOption[]>("/schools/classes");
  const [fromClassId, setFromClassId] = useState("");
  const [toClassId, setToClassId] = useState("");
  const [reason, setReason] = useState("promotion");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const countQuery = fromClassId
    ? `/schools/students?class_id=${fromClassId}&status=active&limit=1`
    : null;
  const { data: countData } = useApiSWR<StudentsListResponse>(countQuery);

  const toOptions = useMemo(
    () => classes.filter((item) => item.id !== fromClassId),
    [classes, fromClassId],
  );

  const fromClass = classes.find((item) => item.id === fromClassId);
  const toClass = classes.find((item) => item.id === toClassId);
  const studentCount = countData?.total ?? 0;

  useEffect(() => {
    if (!open) {
      setFromClassId("");
      setToClassId("");
      setReason("promotion");
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  async function handleConfirm() {
    if (!fromClassId || !toClassId) {
      setError("Please select both classes.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient<{ message: string }>("/schools/students/promote-class", {
        method: "POST",
        body: { from_class_id: fromClassId, to_class_id: toClassId, reason },
      });
      toast.success(response.data.message);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to promote class.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-theme-overlay" onClick={onClose} aria-label="Close" />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-theme bg-theme-surface p-6 shadow-theme-panel">
        <h2 className="text-lg font-semibold text-theme-primary">Promote a class</h2>
        <p className="mt-2 text-sm text-theme-muted">
          Move all active students in one class to another in a single action.
        </p>

        <label className="mt-4 block">
          <span className="mb-1 block text-xs text-theme-muted">From class</span>
          <select className="ms-input" value={fromClassId} onChange={(e) => setFromClassId(e.target.value)}>
            <option value="">Select a class</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {formatClassLabel(item.level, item.stream)}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 block">
          <span className="mb-1 block text-xs text-theme-muted">To class</span>
          <select
            className="ms-input"
            value={toClassId}
            onChange={(e) => setToClassId(e.target.value)}
            disabled={!fromClassId}
          >
            <option value="">Select a class</option>
            {toOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {formatClassLabel(item.level, item.stream)}
              </option>
            ))}
          </select>
        </label>

        {fromClass && toClass ? (
          <p className="mt-4 text-sm text-theme-muted">
            This will move{" "}
            <span className="font-medium text-theme-primary">{studentCount}</span> active students from{" "}
            <span className="font-medium text-theme-primary">
              {formatClassLabel(fromClass.level, fromClass.stream)}
            </span>{" "}
            to{" "}
            <span className="font-medium text-theme-primary">
              {formatClassLabel(toClass.level, toClass.stream)}
            </span>
            .
          </p>
        ) : null}

        <label className="mt-4 block">
          <span className="mb-1 block text-xs text-theme-muted">Reason</span>
          <input className="ms-input" value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-theme bg-theme-warning-bg px-3 py-2 text-sm text-theme-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          This action cannot be undone in bulk. Students can be individually transferred back if needed.
        </div>

        {error ? <p className="mt-3 text-sm text-theme-danger">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="ms-btn-secondary" disabled={loading} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="ms-btn-primary"
            disabled={loading || !fromClassId || !toClassId}
            onClick={() => void handleConfirm()}
          >
            {loading ? "Promoting…" : `Promote ${studentCount} students`}
          </button>
        </div>
      </div>
    </div>
  );
}
