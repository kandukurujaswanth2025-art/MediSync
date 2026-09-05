import React, { useEffect, useState } from "react";
import { History, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useAppAuth } from "@/lib/AppAuthContext";
import { useDbVersion } from "@/hooks/useDbVersion";
import { listStockHistory } from "@/services/resourceService";
import { PageHeader, SectionCard, EmptyState, LoadingState } from "@/components/ui-kit";

export default function ManagerStockHistory() {
  const { hospitalId } = useAppAuth();
  const v = useDbVersion();
  const [history, setHistory] = useState(null);
  useEffect(() => { listStockHistory(hospitalId).then(setHistory); }, [hospitalId, v]);

  if (!history) return <LoadingState label="Loading history…" />;

  return (
    <div className="space-y-6">
      <PageHeader title="Stock History" subtitle="Audit log of all stock changes" icon={History} />
      <SectionCard>
        {history.length ? (
          <div className="space-y-2">
            {history.map((h) => {
              const positive = h.change > 0;
              return (
                <div key={h.id} className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
                  <span className={`grid h-9 w-9 place-items-center rounded-lg ${positive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                    {positive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{h.resourceName}</p>
                    <p className="text-xs text-muted-foreground">{h.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${positive ? "text-emerald-700" : "text-rose-700"}`}>{positive ? "+" : ""}{h.change}</p>
                    <p className="text-xs text-muted-foreground">{new Date(h.date).toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={History} title="No stock changes yet" description="Stock movements will be recorded here." />
        )}
      </SectionCard>
    </div>
  );
}