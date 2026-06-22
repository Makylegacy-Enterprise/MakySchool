"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api/client";
import { formatUGX } from "@/lib/formatCurrency";
import type { OutstandingStudent } from "@/lib/fees/types";
import { useToast } from "@/providers/ToastProvider";

export function WaiveFeeDialog({
  student,
  onClose,
  onWaived,
}: {
  student: OutstandingStudent | null;
  onClose: () => void;
  onWaived: () => void;
}) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (!student) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!reason.trim()) return;
    setLoading(true);
    try {
      await apiClient(`/schools/fees/accounts/${student!.account_id}/waive`, {
        method: "PATCH",
        body: { reason: reason.trim() },
      });
      toast.success(`Outstanding balance waived for ${student!.full_name}.`);
      onWaived();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to waive fees.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-theme-overlay p-4">
      <form onSubmit={(e) => void submit(e)} className="w-full max-w-md rounded-xl border border-theme bg-theme-surface p-6 shadow-theme-panel">
        <h2 className="text-lg font-semibold text-theme-primary">Waive outstanding balance</h2>
        <p className="mt-2 text-sm text-theme-muted">
          Waive outstanding balance for {student.full_name}?
        </p>
        <p className="mt-2 text-lg font-semibold text-theme-danger">{formatUGX(student.balance)}</p>
        <label className="mt-4 block">
          <span className="mb-1 block text-xs text-theme-muted">Reason *</span>
          <textarea className="ms-input w-full" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} required />
        </label>
        <div className="mt-4 flex gap-2">
          <button type="button" className="ms-btn-secondary flex-1" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="ms-btn-primary flex-1 bg-theme-danger text-on-accent" disabled={loading}>
            {loading ? "Waiving…" : `Waive ${formatUGX(student.balance)}`}
          </button>
        </div>
      </form>
    </div>
  );
}
