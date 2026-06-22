import { feeStatusBadgeClass } from "@/lib/fees/types";

export function FeeStatusBadge({ status }: { status: string }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${feeStatusBadgeClass(status)}`}>
      {label}
    </span>
  );
}
