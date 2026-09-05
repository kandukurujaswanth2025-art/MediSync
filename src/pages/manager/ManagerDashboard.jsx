import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Pill, Boxes, AlertTriangle, ClipboardList, ArrowRight } from "lucide-react";
import { useAppAuth } from "@/lib/AppAuthContext";
import { useDbVersion } from "@/hooks/useDbVersion";
import { resourceStats, listRequests } from "@/services/resourceService";
import { StatCard, SectionCard, EmptyState } from "@/components/ui-kit";
import StatusBadge from "@/components/StatusBadge";

export default function ManagerDashboard() {
  const { hospitalId, session } = useAppAuth();
  const v = useDbVersion();
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    resourceStats(hospitalId).then(setStats);
    listRequests(hospitalId).then(setRequests);
  }, [hospitalId, v]);

  const pending = requests.filter((r) => r.status === "PENDING");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{session.name}</h1>
        <p className="text-sm text-muted-foreground">Resource Manager · {session.hospitalCode}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Medicines" value={stats?.totalMedicines ?? "—"} icon={Pill} tone="primary" />
        <StatCard label="Total Equipment" value={stats?.totalEquipment ?? "—"} icon={Boxes} tone="info" />
        <StatCard label="Low Stock" value={stats?.lowStock ?? "—"} icon={AlertTriangle} tone="warning" />
        <StatCard label="Pending Requests" value={stats?.pendingRequests ?? "—"} icon={ClipboardList} tone="danger" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Pending Resource Requests" subtitle={`${pending.length} awaiting action`} actions={<Link to="/manager/requests" className="text-sm font-semibold text-primary hover:underline">Open</Link>}>
          {pending.length ? (
            <div className="space-y-2">
              {pending.slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                  <div><p className="text-sm font-medium">{r.resourceName} × {r.quantity}</p><p className="text-xs text-muted-foreground">{r.reason}</p></div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          ) : <EmptyState icon={ClipboardList} title="No pending requests" description="All requests have been handled." />}
        </SectionCard>

        <div className="grid gap-4 sm:grid-cols-2">
          <QuickLink to="/manager/medicines" icon={Pill} title="Medicines" text="Manage medicine stock" />
          <QuickLink to="/manager/equipment" icon={Boxes} title="Equipment" text="Manage equipment status" />
          <QuickLink to="/manager/departments" icon={Boxes} title="Departments" text="Organize departments" />
          <QuickLink to="/manager/stock-history" icon={ArrowRight} title="Stock History" text="Audit stock changes" />
        </div>
      </div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, title, text }) {
  return (
    <Link to={to} className="card-soft group flex items-center gap-3 p-4 hover:shadow-md">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
      <div className="flex-1"><p className="text-sm font-semibold">{title}</p><p className="text-xs text-muted-foreground">{text}</p></div>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}