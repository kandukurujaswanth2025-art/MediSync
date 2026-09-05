import React, { useEffect, useState } from "react";
import { Stethoscope, Search, Plus, Send, CheckCircle2, Trash2 } from "lucide-react";
import { useAppAuth } from "@/lib/AppAuthContext";
import {
  getCurrentlyServingFromApi,
  completeConsultation,
  createMedicineOrder
} from "@/services/queueService";
import { searchMedicines } from "@/services/resourceService";
import { PageHeader, SectionCard, EmptyState } from "@/components/ui-kit";
import StatusBadge, { PriorityBadge } from "@/components/StatusBadge";

export default function CurrentPatient() {
  const { hospitalId } = useAppAuth();

  const [current, setCurrent] = useState(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [picked, setPicked] = useState({});
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentPatient() {
      try {
        const data = await getCurrentlyServingFromApi();

        if (!cancelled) {
          setCurrent(data);
        }
      } catch (error) {
        console.error("Failed to load current patient:", error);

        if (!cancelled) {
          setCurrent(null);
        }
      }
    }

    if (hospitalId) {
      loadCurrentPatient();
    }

    return () => {
      cancelled = true;
    };
  }, [hospitalId]);

  useEffect(() => {
    let cancelled = false;

    async function loadMedicines() {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      try {
        const data = await searchMedicines(hospitalId, query);

        if (!cancelled) {
          setResults(data);
        }
      } catch (error) {
        console.error("Medicine search error:", error);

        if (!cancelled) {
          setResults([]);
        }
      }
    }

    if (hospitalId) {
      loadMedicines();
    }

    return () => {
      cancelled = true;
    };
  }, [query, hospitalId]);

  const addMedicine = (m) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.medicineId === m.id);

      if (existing) {
        return prev;
      }

      return [
        ...prev,
        {
          medicineId: m.id,
          name: m.name,
          quantity: 1,
          max: m.quantity
        }
      ];
    });

    setPicked((p) => ({
      ...p,
      [m.id]: true
    }));
  };

  const setQty = (id, qty) => {
    setItems((prev) =>
      prev.map((i) =>
        i.medicineId === id
          ? {
              ...i,
              quantity: Math.max(
                1,
                Math.min(Number(qty) || 1, i.max)
              )
            }
          : i
      )
    );
  };

  const removeItem = (id) => {
    setItems((prev) =>
      prev.filter((i) => i.medicineId !== id)
    );

    setPicked((p) => {
      const n = { ...p };
      delete n[id];
      return n;
    });
  };

  const send = async () => {
    if (!current || items.length === 0) {
      return;
    }

    setBusy(true);

    try {
      await createMedicineOrder(hospitalId, current, items);

      setItems([]);
      setPicked({});
      setDone(true);
    } catch (error) {
      console.error("Failed to send medicine list:", error);
    } finally {
      setBusy(false);
    }
  };

  const complete = async () => {
    if (!current) {
      return;
    }

    setBusy(true);

    try {
      await completeConsultation(current.id);

      setItems([]);
      setPicked({});
      setCurrent(null);
      setDone(false);
    } catch (error) {
      console.error("Failed to complete consultation:", error);
    } finally {
      setBusy(false);
    }
  };

  if (!current) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Current Patient"
          subtitle="The patient currently in consultation"
          icon={Stethoscope}
        />

        <EmptyState
          icon={Stethoscope}
          title="No patient in consultation"
          description="Start a consultation from the Patient Queue to prescribe medicines here."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Current Patient"
        subtitle="Consultation & prescription"
        icon={Stethoscope}
      />

      <SectionCard title="Patient in consultation">
        <div className="flex flex-col gap-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="font-mono text-2xl font-bold text-indigo-700">
              {current.token}
            </span>

            <div>
              <p className="font-semibold">
                {current.patientName || current.patient_name || "Patient"}
              </p>

              <p className="text-sm text-muted-foreground">
                {current.problem}
              </p>
            </div>

            {current.priority === "EMERGENCY" && (
              <PriorityBadge priority="EMERGENCY" />
            )}
          </div>

          <StatusBadge status={current.status} />
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">

        <SectionCard
          title="Search Hospital Medicines"
          subtitle="Only medicines in your hospital appear"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search medicine name…"
              className="input-base pl-9"
            />
          </div>

          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
            {query.trim() === "" ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Start typing to search medicines.
              </p>
            ) : results.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No medicines found.
              </p>
            ) : (
              results.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {m.name}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {m.departmentName} · Available: {m.quantity} {m.unit}
                    </p>
                  </div>

                  <button
                    onClick={() => addMedicine(m)}
                    disabled={picked[m.id] || m.quantity === 0}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />

                    {picked[m.id] ? "Added" : "Add"}
                  </button>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Patient Medicines"
          subtitle="Prescription for this visit"
        >
          {items.length === 0 ? (
            <EmptyState
              icon={Plus}
              title="No medicines added"
              description="Search and add medicines to build the prescription."
            />
          ) : (
            <div className="space-y-2">
              {items.map((i) => (
                <div
                  key={i.medicineId}
                  className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {i.name}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Max available: {i.max}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Qty
                    </span>

                    <input
                      type="number"
                      min="1"
                      max={i.max}
                      value={i.quantity}
                      onChange={(e) =>
                        setQty(i.medicineId, e.target.value)
                      }
                      className="w-16 rounded-lg border border-input px-2 py-1 text-sm"
                    />

                    <button
                      onClick={() => removeItem(i.medicineId)}
                      className="grid h-7 w-7 place-items-center rounded-lg text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={send}
              disabled={busy || items.length === 0}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              Send Medicine List
            </button>

            <button
              onClick={complete}
              disabled={busy}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />
              Complete Consultation
            </button>
          </div>

          {done && (
            <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Medicine list sent to the patient. Inventory has been updated.
            </p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}