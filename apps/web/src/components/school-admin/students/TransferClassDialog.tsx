"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { formatClassLabel } from "@makyschool/shared/constants";
import { apiClient } from "@/lib/api/client";
import { useApiSWR } from "@/hooks/useApiSWR";
import type { ClassOption, StudentListItem } from "@/lib/students/types";
import { useToast } from "@/providers/ToastProvider";

export function TransferClassDialog({
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
  const [newClassId, setNewClassId] = useState("");
  const [reason, setReason] = useState("transfer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(
    () => classes.filter((item) => item.id !== student?.class_id),
    [classes, student?.class_id],
  );

  if (!student) return null;

  async function handleConfirm() {
    if (!newClassId) {
      setError("Please select a new class.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient<{ message: string }>(`/schools/students/${student!.id}/transfer`, {
        method: "PATCH",
        body: { new_class_id: newClassId, reason },
      });
      toast.success(response.data.message);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to transfer student.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-theme-overlay" onClick={onClose} aria-label="Close" />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-theme bg-theme-surface p-6 shadow-theme-panel">
        <h2 className="text-lg font-semibold text-theme-primary">Transfer {student.full_name}</h2>
        <p className="mt-2 text-sm text-theme-muted">
          Currently in <span className="font-medium text-theme-primary">{student.class_name ?? "—"}</span>
        </p>

        <label className="mt-4 block">
          <span className="mb-1 block text-xs text-theme-muted">New class</span>
          <select className="ms-input" value={newClassId} onChange={(e) => setNewClassId(e.target.value)}>
            <option value="">Select a class</option>
            {options.map((item) => (
              <option key={item.id} value={item.id}>
                {formatClassLabel(item.level, item.stream)}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 block">
          <span className="mb-1 block text-xs text-theme-muted">Reason</span>
          <select className="ms-input" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="promotion">Promotion</option>
            <option value="transfer">Transfer</option>
            <option value="correction">Correction</option>
            <option value="other">Other</option>
          </select>
        </label>

        {reason === "promotion" ? (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-theme-raised px-3 py-2 text-sm text-theme-muted">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-theme-accent" />
            You can promote an entire class at once using the Promote Class tool.
          </div>
        ) : null}

        {error ? <p className="mt-3 text-sm text-theme-danger">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="ms-btn-secondary" disabled={loading} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="ms-btn-primary" disabled={loading} onClick={() => void handleConfirm()}>
            {loading ? "Transferring…" : "Transfer student"}
          </button>
        </div>
      </div>
    </div>
  );
}
