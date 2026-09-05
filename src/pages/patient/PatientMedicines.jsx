import React, { useEffect, useState } from "react";
import { Pill } from "lucide-react";
import { useAppAuth } from "@/lib/AppAuthContext";
import { useDbVersion } from "@/hooks/useDbVersion";
import { listMedicineOrdersForPatient } from "@/services/queueService";
import { PageHeader, SectionCard, EmptyState, LoadingState } from "@/components/ui-kit";
import StatusBadge from "@/components/StatusBadge";

export default function PatientMedicines() {
  const { session } = useAppAuth();
  const v = useDbVersion();
  const [orders, setOrders] = useState(null);

  useEffect(() => { listMedicineOrdersForPatient(session.patientId).then(setOrders); }, [session?.patientId, v]);

  if (!orders) return <LoadingState label="Loading medicines…" />;

  return (
    <div className="space-y-6">
      <PageHeader title="Medicine List" subtitle="Medicines prescribed and ready for collection" icon={Pill} />
      {orders.length ? (
        <div className="space-y-4">
          {orders.map((o) => (
            <SectionCard key={o.id} title="Medicine List" subtitle={new Date(o.createdAt).toLocaleString()} actions={<StatusBadge status={o.status} />}>
              <div className="space-y-2">
                {o.items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Pill className="h-4 w-4" /></span>
                      <p className="text-sm font-medium">{it.name}</p>
                    </div>
                    <p className="text-sm font-semibold">Quantity: {it.quantity}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          ))}
        </div>
      ) : (
        <EmptyState icon={Pill} title="No medicines yet" description="Medicines prescribed by your doctor will appear here." />
      )}
    </div>
  );
}