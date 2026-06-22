"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api/client";
import { formatUGX } from "@/lib/formatCurrency";
import type { FeePayment } from "@/lib/fees/types";
import { useToast } from "@/providers/ToastProvider";

export function VoidPaymentDialog({
  payment,
  onClose,
  onVoided,
}: {
  payment: FeePayment | null;
  onClose: () => void;
  onVoided: () => void;
}) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (!payment) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!reason.trim()) return;
    setLoading(true);
    try {
      await apiClient(`/schools/fees/payments/${payment!.id}/void`, {
        method: "POST",
        body: { reason: reason.trim() },
      });
      toast.success(`Payment ${payment!.receipt_number} has been voided.`);
      onVoided();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to void payment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-theme-overlay p-4">
      <form onSubmit={(e) => void submit(e)} className="w-full max-w-md rounded-xl border border-theme bg-theme-surface p-6 shadow-theme-panel">
        <h2 className="text-lg font-semibold text-theme-primary">Void payment</h2>
        <p className="mt-2 text-sm text-theme-muted">
          Void {payment.receipt_number} ({formatUGX(payment.amount)}) for {payment.student_name}?
        </p>
        <label className="mt-4 block">
          <span className="mb-1 block text-xs text-theme-muted">Reason *</span>
          <textarea className="ms-input w-full" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} required />
        </label>
        <div className="mt-4 flex gap-2">
          <button type="button" className="ms-btn-secondary flex-1" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="ms-btn-primary flex-1 bg-theme-danger text-on-accent" disabled={loading}>
            {loading ? "Voiding…" : "Void payment"}
          </button>
        </div>
      </form>
    </div>
  );
}
