import React, { useEffect, useState } from "react";
import { PhoneCall, Play, CheckCircle2, Users } from "lucide-react";
import { useAppAuth } from "@/lib/AppAuthContext";
import { useDbVersion } from "@/hooks/useDbVersion";
import {
  listQueue,
  callPatient,
  startConsultation,
  completeConsultation,
  getCurrentlyServingFromApi
} from "@/services/queueService";
import {
  PageHeader,
  SectionCard,
  EmptyState,
  LoadingState
} from "@/components/ui-kit";
import StatusBadge, { PriorityBadge } from "@/components/StatusBadge";
import Modal from "@/components/Modal";
import { cn } from "@/lib/utils";

export default function PatientQueue() {
  const { hospitalId } = useAppAuth();
  const v = useDbVersion();

  const [queue, setQueue] = useState(null);
  const [current, setCurrent] = useState(null);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!hospitalId) return;

    try {
      const [queueData, currentData] = await Promise.all([
        listQueue(hospitalId),
        getCurrentlyServingFromApi()
      ]);

      setQueue(queueData || []);
      setCurrent(currentData || null);
    } catch (error) {
      console.error("Failed to load queue:", error);
      setQueue([]);
      setCurrent(null);
    }
  };

  useEffect(() => {
    load();
  }, [hospitalId, v]);

  const act = async (fn, id) => {
    setBusy(true);

    try {
      await fn(id);
      await load();
    } catch (error) {
      console.error("Queue action failed:", error);
      alert(error.message || "Action failed");
    } finally {
      setBusy(false);
      setSelected(null);
    }
  };

  if (!queue) {
    return <LoadingState label="Loading queue…" />;
  }

  const waiting = queue.filter(
    (q) => q.status === "WAITING"
  );

  const called = queue.filter(
    (q) => q.status === "CALLED"
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patient Queue"
        subtitle="Live hospital queue — emergency patients first"
        icon={Users}
      />

      <SectionCard
        title="Currently Serving"
        subtitle="Patient in consultation"
      >
        {current ? (
          <div className="flex flex-col gap-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="font-mono text-2xl font-bold text-indigo-700">
                {current.token}
              </span>

              <div>
                <p className="font-semibold">
                  {current.patientName}
                </p>

                <p className="text-sm text-muted-foreground">
                  {current.problem}
                </p>
              </div>

              {current.priority === "EMERGENCY" && (
                <PriorityBadge priority="EMERGENCY" />
              )}
            </div>

            <div className="flex items-center gap-2">
              <StatusBadge status={current.status} />

              <button
                onClick={() =>
                  act(completeConsultation, current.id)
                }
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                Complete
              </button>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="No patient in consultation"
            description="Call a waiting patient to start a consultation."
          />
        )}
      </SectionCard>

      {called.length > 0 && (
        <SectionCard
          title="Called"
          subtitle="Patients asked to proceed"
        >
          <div className="space-y-2">
            {called.map((q) => (
              <div
                key={q.id}
                className={cn(
                  "flex items-center justify-between rounded-xl border px-4 py-3",
                  q.priority === "EMERGENCY"
                    ? "border-red-300 bg-red-50"
                    : "border-sky-200 bg-sky-50/40"
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "font-mono text-sm font-bold",
                      q.priority === "EMERGENCY"
                        ? "text-red-700"
                        : "text-sky-700"
                    )}
                  >
                    {q.token}
                  </span>

                  <div>
                    <p className="text-sm font-medium">
                      {q.patientName}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {q.problem}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {q.priority === "EMERGENCY" && (
                    <PriorityBadge priority="EMERGENCY" />
                  )}

                  <button
                    onClick={() =>
                      act(startConsultation, q.id)
                    }
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                  >
                    <Play className="h-4 w-4" />
                    Start Consultation
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Waiting Queue"
        subtitle={`${waiting.length} patient(s) waiting`}
      >
        {waiting.length ? (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Token</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="hidden px-4 py-3 sm:table-cell">
                    Problem
                  </th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="hidden px-4 py-3 md:table-cell">
                    Registered
                  </th>
                  <th className="px-4 py-3">Position</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {waiting.map((q, i) => (
                  <tr
                    key={q.id}
                    className={cn(
                      "hover:bg-muted/30",
                      q.priority === "EMERGENCY" &&
                        "bg-red-50/60"
                    )}
                  >
                    <td
                      className={cn(
                        "px-4 py-3 font-mono font-bold",
                        q.priority === "EMERGENCY"
                          ? "text-red-700"
                          : "text-primary"
                      )}
                    >
                      {q.token}
                    </td>

                    <td className="px-4 py-3 font-medium">
                      {q.patientName}
                    </td>

                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                      {q.problem}
                    </td>

                    <td className="px-4 py-3">
                      {q.priority === "EMERGENCY" ? (
                        <PriorityBadge priority="EMERGENCY" />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Normal
                        </span>
                      )}
                    </td>

                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                      {new Date(
                        q.registeredAt
                      ).toLocaleTimeString()}
                    </td>

                    <td className="px-4 py-3 font-medium">
                      #{i + 1}
                    </td>

                    <td className="px-4 py-3">
                      <StatusBadge status={q.status} />
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelected(q)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="No patients waiting"
            description="The queue is currently empty."
          />
        )}
      </SectionCard>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Patient Details"
      >
        {selected && (
          <div className="space-y-4">
            <div
              className={cn(
                "rounded-xl border p-4",
                selected.priority === "EMERGENCY"
                  ? "border-red-300 bg-red-50"
                  : "border-border bg-muted/30"
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "font-mono text-2xl font-bold",
                    selected.priority === "EMERGENCY"
                      ? "text-red-700"
                      : "text-primary"
                  )}
                >
                  {selected.token}
                </span>

                <div className="flex items-center gap-2">
                  {selected.priority === "EMERGENCY" && (
                    <PriorityBadge priority="EMERGENCY" />
                  )}

                  <StatusBadge status={selected.status} />
                </div>
              </div>

              <p className="mt-2 text-lg font-semibold">
                {selected.patientName}
              </p>

              <p className="text-sm text-muted-foreground">
                Problem: {selected.problem}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Registered at{" "}
                {new Date(
                  selected.registeredAt
                ).toLocaleTimeString()}
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                onClick={() =>
                  act(callPatient, selected.id)
                }
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
              >
                <PhoneCall className="h-4 w-4" />
                Call Patient
              </button>

              <button
                onClick={() =>
                  act(startConsultation, selected.id)
                }
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                <Play className="h-4 w-4" />
                Start Consultation
              </button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Calling a patient sends them an in-app notification instantly.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}