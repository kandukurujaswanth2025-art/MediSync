import React from "react";
import { cn } from "@/lib/utils";

const MAP = {
  WAITING: { label: "Waiting", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  CALLED: { label: "Called", cls: "bg-sky-100 text-sky-700 border-sky-200" },
  IN_CONSULTATION: { label: "In Consultation", cls: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  COMPLETED: { label: "Completed", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  AVAILABLE: { label: "Available", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  LOW_STOCK: { label: "Low Stock", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  OUT_OF_SERVICE: { label: "Out of Service", cls: "bg-rose-100 text-rose-700 border-rose-200" },
  UNDER_MAINTENANCE: { label: "Under Maintenance", cls: "bg-slate-200 text-slate-700 border-slate-300" },
  PENDING: { label: "Pending", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  APPROVED: { label: "Approved", cls: "bg-sky-100 text-sky-700 border-sky-200" },
  READY_FOR_COLLECTION: { label: "Ready for Collection", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

export default function StatusBadge({ status, className }) {
  const cfg = MAP[status] || { label: status, cls: "bg-slate-100 text-slate-600 border-slate-200" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold", cfg.cls, className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {cfg.label}
    </span>
  );
}

export function PriorityBadge({ priority, className }) {
  if (priority !== "EMERGENCY") return null;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold text-white", className)}>
      🚨 EMERGENCY
    </span>
  );
}