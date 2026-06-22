"use client";

import { useState } from "react";
import { UserMinus } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import type { StudentListItem } from "@/lib/students/types";
import { useToast } from "@/providers/ToastProvider";

export function WithdrawStudentDialog({
  student,
  onClose,
  onSaved,
}: {
  student: StudentListItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!student) return null;

  async function handleConfirm() {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient<{ message: string }>(`/schools/students/${student!.id}/withdraw`, {
        method: "PATCH",
        body: { reason: reason.trim() || undefined },
      });
      toast.warning(response.data.message, 4000);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to withdraw student.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-theme-overlay" onClick={onClose} aria-label="Close" />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-theme bg-theme-surface p-6 shadow-theme-panel">
        <UserMinus className="mx-auto h-8 w-8 text-theme-danger" />
        <h2 className="mt-4 text-center text-lg font-semibold text-theme-primary">
          Withdraw {student.full_name}?
        </h2>
        <p className="mt-2 text-center text-sm text-theme-muted">
          They will be removed from active lists. All records, results, and fee history are preserved.
        </p>

        <label className="mt-4 block">
          <span className="mb-1 block text-xs text-theme-muted">Reason (optional)</span>
          <textarea
            className="ms-input min-h-24"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for withdrawal (optional)"
          />
        </label>

        {error ? <p className="mt-3 text-sm text-theme-danger">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="ms-btn-secondary" disabled={loading} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleConfirm()}
            className="rounded-lg border border-theme bg-theme-danger-bg px-4 py-2 text-sm font-medium text-theme-danger hover:opacity-90"
          >
            {loading ? "Withdrawing…" : "Withdraw student"}
          </button>
        </div>
      </div>
    </div>
  );
}
