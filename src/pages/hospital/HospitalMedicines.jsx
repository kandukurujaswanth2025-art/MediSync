import React, { useEffect, useState } from "react";
import { Pill, Search } from "lucide-react";
import { useAppAuth } from "@/lib/AppAuthContext";
import { useDbVersion } from "@/hooks/useDbVersion";
import { listResources } from "@/services/resourceService";
import { PageHeader, SectionCard, EmptyState, LoadingState } from "@/components/ui-kit";
import StatusBadge from "@/components/StatusBadge";

export default function HospitalMedicines() {
  const { hospitalId } = useAppAuth();
  const v = useDbVersion();
  const [meds, setMeds] = useState(null);
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("all");

  useEffect(() => { listResources(hospitalId, "medicine").then(setMeds); }, [hospitalId, v]);

  const departments = useMemoUnique(meds);
  const filtered = (meds || []).filter((m) =>
    (!query.trim() || m.name.toLowerCase().includes(query.trim().toLowerCase())) &&
    (dept === "all" || m.departmentName === dept)
  );

  if (!meds) return <LoadingState label="Loading medicines…" />;

  return (
    <div className="space-y-6">
      <PageHeader title="Search Hospital Medicines" subtitle="Medicines available in your hospital only" icon={Pill} />
      <SectionCard>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search medicine name…" className="input-base pl-9" />
          </div>
          <select value={dept} onChange={(e) => setDept(e.target.value)} className="input-base sm:w-56">
            <option value="all">All departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </SectionCard>

      {filtered.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <div key={m.id} className="card-soft p-5">
              <div className="flex items-start justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Pill className="h-5 w-5" /></span>
                <StatusBadge status={m.status} />
              </div>
              <h3 className="mt-3 font-semibold">{m.name}</h3>
              <p className="text-sm text-muted-foreground">{m.departmentName}</p>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Available</span>
                <span className="font-semibold">{m.quantity} {m.unit}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Minimum</span>
                <span className="font-medium">{m.minStock} {m.unit}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Pill} title="No medicines found" description="Try a different search or department filter." />
      )}
    </div>
  );
}

function useMemoUnique(meds) {
  const [deps, setDeps] = useState([]);
  useEffect(() => {
    if (!meds) return;
    setDeps([...new Set(meds.map((m) => m.departmentName))].sort());
  }, [meds]);
  return deps;
}