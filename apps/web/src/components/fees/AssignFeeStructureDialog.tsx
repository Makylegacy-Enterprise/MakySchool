"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api/client";
import { formatUGX } from "@/lib/formatCurrency";
import type { FeeStructure } from "@/lib/fees/types";
import { useToast } from "@/providers/ToastProvider";

export function AssignFeeStructureDialog({
  structure,
  onClose,
  onAssigned,
}: {
  structure: FeeStructure | null;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ assigned: number; already_had_account: number; total_students: number } | null>(null);

  if (!structure) return null;

  async function confirm() {
    setLoading(true);
    try {
      const response = await apiClient<{ assigned: number; already_had_account: number; total_students: number }>(
        `/schools/fees/structures/${structure!.id}/assign`,
        { method: "POST" },
      );
      setResult(response.data);
      toast.success(`Fee accounts created for ${response.data.assigned} students.`);
      onAssigned();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign fee structure.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-theme-overlay p-4">
      <div className="w-full max-w-md rounded-xl border border-theme bg-theme-surface p-6 shadow-theme-panel">
        {result ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-theme-primary">Assignment complete</h2>
            <p className="text-sm text-theme-muted">
              Fee accounts created for {result.assigned} students. {result.already_had_account} students already had accounts.
            </p>
            <button type="button" className="ms-btn-primary w-full" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-theme-primary">Assign fee structure</h2>
            <p className="text-sm text-theme-muted">
              Assign {structure.term_name} fees ({formatUGX(Number(structure.amount))}) to all active students in{" "}
              {structure.class_name}? This creates a fee account for each student.
            </p>
            <div className="flex gap-2">
              <button type="button" className="ms-btn-secondary flex-1" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="ms-btn-primary flex-1" disabled={loading} onClick={() => void confirm()}>
                {loading ? "Assigning…" : `Assign to ${structure.student_count || "class"} students`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
