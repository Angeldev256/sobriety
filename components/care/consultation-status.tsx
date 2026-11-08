import type { ConsultationStatus } from "@/lib/database.types";

const LABELS: Record<ConsultationStatus, { label: string; className: string }> = {
  awaiting_payment: { label: "Awaiting payment", className: "border border-ash text-body" },
  paid: { label: "Active", className: "bg-primary text-primary-fg" },
  completed: { label: "Completed", className: "bg-surface-3 text-body" },
  cancelled: { label: "Cancelled", className: "bg-surface-3 text-muted" },
  refunded: { label: "Refunded", className: "bg-surface-3 text-muted" },
};

export function ConsultationStatusLabel({ status }: { status: ConsultationStatus }) {
  const s = LABELS[status];
  return <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${s.className}`}>{s.label}</span>;
}
