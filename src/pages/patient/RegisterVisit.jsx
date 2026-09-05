import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, Ticket, Clock, ListOrdered, Stethoscope } from "lucide-react";
import { useAppAuth } from "@/lib/AppAuthContext";
import { useDbVersion } from "@/hooks/useDbVersion";
import {
  registerVisit,
  getMyQueueEntry,
  getQueuePosition
} from "@/services/queueService";
import { PageHeader, SectionCard, EmptyState } from "@/components/ui-kit";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";

import API_URL from "@/api/config";

const SUGGESTIONS = [
  "Headache",
  "Fever",
  "Chest pain",
  "Stomach pain",
  "Cold",
  "Dizziness",
  "Back pain",
  "Migraine"
];

export default function RegisterVisit() {
  const { session, selectedHospitalId } = useAppAuth();
  const navigate = useNavigate();
  const v = useDbVersion();

  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [entry, setEntry] = useState(null);
  const [pos, setPos] = useState(null);
  const [current, setCurrent] = useState(null);
  const [hospital, setHospital] = useState(null);

  const getToken = () => {
    const saved = localStorage.getItem("medisync_session");
    const data = saved ? JSON.parse(saved) : null;
    return data?.token;
  };

  const loadHospital = async () => {
    if (!selectedHospitalId) return;

    try {
      const token = getToken();

      const response = await fetch(
        `${API_URL}/hospitals/${selectedHospitalId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch hospital");
      }

      const data = await response.json();
      setHospital(data);
    } catch (error) {
      console.error("Failed to load hospital:", error);
    }
  };

  const load = async () => {
    if (!selectedHospitalId || !session?.patientId) {
      return;
    }

    try {
      const myEntry = await getMyQueueEntry(
        selectedHospitalId,
        session.patientId
      );

      setEntry(myEntry);

      if (myEntry) {
        const positionData = await getQueuePosition(myEntry.id);

        setPos({
          position: Number(positionData.position) || 0,
          patientsAhead: Number(positionData.patientsAhead) || 0,
          estimatedMinutes:
            Number(positionData.estimatedWaitMinutes) || 0
        });
      } else {
        setPos(null);
      }

      setCurrent(null);
    } catch (error) {
      console.error("Failed to load queue information:", error);
      setEntry(null);
      setPos(null);
      setCurrent(null);
    }
  };

  useEffect(() => {
    loadHospital();
    load();
  }, [selectedHospitalId, session?.patientId, v]);

  const submit = async (e) => {
    e.preventDefault();

    if (!selectedHospitalId || !session?.patientId) {
      return;
    }

    setBusy(true);

    try {
      await registerVisit(
        selectedHospitalId,
        {
          id: session.patientId,
          fullName: session.name
        },
        problem
      );

      setProblem("");

      await load();
    } catch (error) {
      console.error("Failed to register visit:", error);
      alert(error.message || "Failed to register visit");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Register for Consultation"
        subtitle={hospital ? hospital.name : ""}
        icon={UserPlus}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Describe your problem"
          subtitle="This helps the hospital prepare for your visit"
        >
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Problem / Reason for visit
              </span>

              <textarea
                required
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                rows={3}
                className="input-base"
                placeholder="e.g. Headache, Fever, Chest pain…"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setProblem(s)}
                  className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {s}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setProblem("EMERGENCY")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold",
                  problem === "EMERGENCY"
                    ? "border-red-600 bg-red-600 text-white"
                    : "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                )}
              >
                🚨 EMERGENCY
              </button>
            </div>

            <button
              type="submit"
              disabled={busy || !problem.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              <Ticket className="h-4 w-4" />
              {busy ? "Generating token…" : "Get Token"}
            </button>
          </form>
        </SectionCard>

        <SectionCard title="Your Token">
          {entry ? (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary to-[hsl(221_47%_30%)] p-6 text-primary-foreground">
                <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-teal-400/20 blur-3xl" />

                <div className="relative">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/70">
                    Your Token
                  </p>

                  <p className="mt-1 font-mono text-4xl font-bold">
                    {entry.token}
                  </p>

                  <div className="mt-3">
                    <StatusBadge status={entry.status} />
                  </div>

                  {entry.priority === "EMERGENCY" && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
                      🚨 EMERGENCY PRIORITY
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <MiniStat
                  icon={Stethoscope}
                  label="Current serving"
                  value={current ? current.token : "—"}
                />

                <MiniStat
                  icon={ListOrdered}
                  label="Patients ahead"
                  value={
                    entry.status === "WAITING" && pos
                      ? pos.patientsAhead
                      : "—"
                  }
                />

                <MiniStat
                  icon={Clock}
                  label="Est. wait"
                  value={
                    entry.status === "WAITING" && pos
                      ? `~${pos.estimatedMinutes}m`
                      : "—"
                  }
                />
              </div>

              <button
                onClick={() => navigate("/patient/queue")}
                className="w-full rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
              >
                View My Queue
              </button>
            </div>
          ) : (
            <EmptyState
              icon={Ticket}
              title="No active token"
              description="Submit the form to generate your queue token."
            />
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-muted-foreground" />

      <p className="mt-1 text-sm font-bold">
        {value}
      </p>

      <p className="text-[11px] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}