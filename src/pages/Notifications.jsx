import React, { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useAppAuth } from "@/lib/AppAuthContext";
import { useDbVersion } from "@/hooks/useDbVersion";
import { listNotifications, markRead, markAllRead } from "@/services/notificationService";
import { PageHeader, SectionCard, EmptyState, LoadingState } from "@/components/ui-kit";

export default function Notifications() {
  const { session, role, hospitalId, patientId, selectedHospitalId } = useAppAuth();
  const v = useDbVersion();
  const [items, setItems] = useState(null);

  const scope = role; // 'hospital' | 'manager' | 'patient'
  const targetId = role === "patient" ? patientId : null;
  const effHospitalId = role === "patient" ? selectedHospitalId : hospitalId;

  useEffect(() => {
    if (!effHospitalId) return;
    listNotifications(effHospitalId, scope, targetId).then(setItems);
  }, [effHospitalId, scope, targetId, v]);

  const handleMarkAll = async () => {
    await markAllRead(effHospitalId, scope, targetId);
  };

  if (!items) return <LoadingState label="Loading notifications…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="Stay updated on queue, stock and requests"
        icon={Bell}
        actions={items.some((n) => !n.read) ? (
          <button onClick={handleMarkAll} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted">
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        ) : null}
      />
      <SectionCard>
        {items.length ? (
          <div className="divide-y divide-border">
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`flex w-full items-start gap-3 px-1 py-3.5 text-left ${n.read ? "" : "hover:bg-muted/30"}`}
              >
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-teal-500"}`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm ${n.read ? "font-medium text-muted-foreground" : "font-semibold text-foreground"}`}>{n.title}</p>
                    <span className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState icon={Bell} title="No notifications" description="You're all caught up." />
        )}
      </SectionCard>
    </div>
  );
}