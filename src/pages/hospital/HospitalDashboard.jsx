import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Stethoscope,
  CheckCircle2,
  Pill,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import { useAppAuth } from "@/lib/AppAuthContext";
import { useDbVersion } from "@/hooks/useDbVersion";
import {
  hospitalStats,
  listQueue,
  getCurrentlyServingFromApi
} from "@/services/queueService";
import { StatCard, SectionCard, EmptyState } from "@/components/ui-kit";
import StatusBadge, { PriorityBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";

export default function HospitalDashboard() {
  const { hospitalId, session } = useAppAuth();
  const v = useDbVersion();

  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);

  const load = async () => {
    if (!hospitalId) return;

    try {
      const [statsData, queueData, currentData] =
        await Promise.all([
          hospitalStats(hospitalId),
          listQueue(hospitalId),
          getCurrentlyServingFromApi()
        ]);

      setStats(statsData);
      setQueue(queueData || []);
      setCurrent(currentData || null);
    } catch (error) {
      console.error("Failed to load hospital dashboard:", error);
    }
  };

  useEffect(() => {
    load();
  }, [hospitalId, v]);

  const waiting = queue.filter(
    (q) => q.status === "WAITING"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {session.name}
        </h1>

        <p className="text-sm text-muted-foreground">
          Hospital code {session.hospitalCode} · Operations overview
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Patients Waiting"
          value={stats?.waiting ?? "—"}
          icon={Users}
          tone="warning"
          hint={
            stats?.emergencyWaiting
              ? `${stats.emergencyWaiting} emergency`
              : undefined
          }
        />

        <StatCard
          label="Current Patient"
          value={current ? current.token : "—"}
          icon={Stethoscope}
          tone="info"
          hint={
            current
              ? current.patientName || current.patient_name || "Patient"
              : "None in consultation"
          }
        />

        <StatCard
          label="Completed"
          value={stats?.completed ?? "—"}
          icon={CheckCircle2}
          tone="success"
        />

        <StatCard
          label="Available Medicines"
          value={stats?.availableMedicines ?? "—"}
          icon={Pill}
          tone="primary"
        />

        <StatCard
          label="Low Stock"
          value={stats?.lowStock ?? "—"}
          icon={AlertTriangle}
          tone="danger"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard
          title="Currently Serving"
          subtitle="Patient in consultation right now"
          className="lg:col-span-1"
        >
          {current ? (
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-lg font-bold text-primary">
                  {current.token}
                </span>

                <StatusBadge status={current.status} />
              </div>

              <p className="mt-2 font-semibold">
                {current.patientName ||
                  current.patient_name ||
                  "Patient"}
              </p>

              <p className="text-sm text-muted-foreground">
                {current.problem}
              </p>
            </div>
          ) : (
            <EmptyState
              icon={Stethoscope}
              title="No patient in consultation"
              description="Call a waiting patient to begin."
            />
          )}
        </SectionCard>

        <SectionCard
          title="Waiting Queue"
          subtitle={`${waiting.length} patient(s) waiting${
            stats?.emergencyWaiting
              ? ` · ${stats.emergencyWaiting} emergency`
              : ""
          }`}
          className="lg:col-span-2"
          actions={
            <Link
              to="/hospital/queue"
              className="text-sm font-semibold text-primary hover:underline"
            >
              Open queue
            </Link>
          }
        >
          {waiting.length ? (
            <div className="space-y-2">
              {waiting.slice(0, 5).map((q) => {
                const patientName =
                  q.patientName ||
                  q.patient_name ||
                  q.name ||
                  "Patient";

                return (
                  <div
                    key={q.id}
                    className={cn(
                      "flex items-center justify-between rounded-xl border px-4 py-3",
                      q.priority === "EMERGENCY"
                        ? "border-red-300 bg-red-50"
                        : "border-border"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "font-mono text-sm font-bold",
                          q.priority === "EMERGENCY"
                            ? "text-red-700"
                            : "text-primary"
                        )}
                      >
                        {q.token}
                      </span>

                      <div>
                        <p className="text-sm font-medium">
                          {patientName}
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

                      <StatusBadge status={q.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="Queue is empty"
              description="No patients are waiting right now."
            />
          )}
        </SectionCard>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <QuickLink
          to="/hospital/queue"
          icon={Users}
          title="Patient Queue"
          text="Call, consult and complete patients"
        />

        <QuickLink
          to="/hospital/medicines"
          icon={Pill}
          title="Search Medicines"
          text="Find medicines available in your hospital"
        />

        <QuickLink
          to="/hospital/requests"
          icon={ArrowRight}
          title="Resource Requests"
          text="Request stock from the resource manager"
        />
      </div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, title, text }) {
  return (
    <Link
      to={to}
      className="card-soft group flex items-center gap-4 p-5 hover:shadow-md"
    >
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>

      <div className="flex-1">
        <p className="font-semibold">{title}</p>

        <p className="text-sm text-muted-foreground">
          {text}
        </p>
      </div>

      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}