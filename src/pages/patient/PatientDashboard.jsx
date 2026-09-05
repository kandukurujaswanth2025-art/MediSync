import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  UserPlus,
  ListOrdered,
  Pill,
  Bell,
  Clock,
  Stethoscope,
  Ticket
} from "lucide-react";
import { useAppAuth } from "@/lib/AppAuthContext";
import { useDbVersion } from "@/hooks/useDbVersion";
import {
  getMyQueueEntry,
  getQueuePosition,
  getCurrentlyServingFromApi,
  listMedicineOrdersForPatient
} from "@/services/queueService";
import { SectionCard, EmptyState, LoadingState } from "@/components/ui-kit";
import StatusBadge from "@/components/StatusBadge";

const API_URL = "http://localhost:5000/api";

export default function PatientDashboard() {
  const { session, selectedHospitalId } = useAppAuth();
  const v = useDbVersion();

  const [entry, setEntry] = useState(null);
  const [current, setCurrent] = useState(null);
  const [position, setPosition] = useState(null);
  const [orders, setOrders] = useState([]);
  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedHospitalId || !session?.patientId) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        setLoading(true);

        const hospitalResponse = await fetch(
          `${API_URL}/hospitals/${selectedHospitalId}`
        );

        const hospitalData = await hospitalResponse.json();

        if (hospitalResponse.ok) {
          setHospital(hospitalData);
        }

        const e = await getMyQueueEntry(
          selectedHospitalId,
          session.patientId
        );

        setEntry(e);

        if (e && e.status === "WAITING") {
          const positionData = await getQueuePosition(e.id);

          setPosition({
            position: Number(positionData.position || 0),
            patientsAhead: Number(
              positionData.patientsAhead || 0
            ),
            estimatedMinutes: Number(
              positionData.estimatedWaitMinutes || 0
            )
          });
        } else {
          setPosition(null);
        }

        const currentPatient =
          await getCurrentlyServingFromApi();

        setCurrent(currentPatient);

        const medicineOrders =
          await listMedicineOrdersForPatient(
            session.patientId
          );

        setOrders(medicineOrders);
      } catch (error) {
        console.error(
          "Patient dashboard loading error:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [
    selectedHospitalId,
    session?.patientId,
    v
  ]);

  if (loading) {
    return (
      <LoadingState label="Loading your dashboard…" />
    );
  }

  const readyOrders = orders.filter(
    (o) => o.status === "READY_FOR_COLLECTION"
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Hello, {session.name}
          </h1>

          <p className="text-sm text-muted-foreground">
            {hospital
              ? hospital.name
              : "No hospital selected"}

            {hospital && (
              <span className="ml-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
                {hospital.code}
              </span>
            )}
          </p>
        </div>

        <Link
          to="/patient/register-visit"
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <UserPlus className="h-4 w-4" />
          Register for consultation
        </Link>
      </div>

      {/* Current token card */}
      {entry ? (
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary to-[hsl(221_47%_30%)] p-6 text-primary-foreground">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-teal-400/20 blur-3xl" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/70">
                Your Token
              </p>

              <p className="mt-1 font-mono text-4xl font-bold">
                {entry.token}
              </p>

              <p className="mt-1 text-sm text-primary-foreground/80">
                {entry.problem}
              </p>
            </div>

            <div className="flex flex-col items-start gap-2 sm:items-end">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-300" />
                {entry.status.replace(/_/g, " ")}
              </span>

              {entry.status === "WAITING" && (
                <p className="text-sm text-primary-foreground/80">
                  You are #{position?.position || 0} in queue
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <SectionCard>
          <EmptyState
            icon={Ticket}
            title="You are not in the queue"
            description="Register for a consultation to get your token."
            action={
              <Link
                to="/patient/register-visit"
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Register now
              </Link>
            }
          />
        </SectionCard>
      )}

      {/* Status grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SectionCard title="Current Serving">
          {current ? (
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-indigo-700">
                <Stethoscope className="h-5 w-5" />
              </span>

              <div>
                <p className="font-mono font-bold text-indigo-700">
                  {current.token}
                </p>

                <p className="text-xs text-muted-foreground">
                  {current.patientName}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No patient in consultation.
            </p>
          )}
        </SectionCard>

        <SectionCard title="Patients Ahead">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700">
              <ListOrdered className="h-5 w-5" />
            </span>

            <p className="text-2xl font-semibold">
              {entry?.status === "WAITING"
                ? position?.patientsAhead || 0
                : "—"}
            </p>
          </div>
        </SectionCard>

        <SectionCard title="Estimated Waiting Time">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-100 text-teal-700">
              <Clock className="h-5 w-5" />
            </span>

            <div>
              <p className="text-2xl font-semibold">
                {entry?.status === "WAITING"
                  ? `~${position?.estimatedMinutes || 0} min`
                  : "—"}
              </p>

              <p className="text-xs text-muted-foreground">
                Estimate only
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Medicines to collect */}
      <SectionCard
        title="Medicines to Collect"
        subtitle={
          readyOrders.length
            ? `${readyOrders.length} list(s) ready`
            : ""
        }
        actions={
          <Link
            to="/patient/medicines"
            className="text-sm font-semibold text-primary hover:underline"
          >
            View all
          </Link>
        }
      >
        {readyOrders.length ? (
          <div className="space-y-3">
            {readyOrders.slice(0, 1).map((o) => (
              <div
                key={o.id}
                className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-emerald-800">
                    Ready for collection
                  </p>

                  <StatusBadge status="READY_FOR_COLLECTION" />
                </div>

                <div className="mt-2 space-y-1">
                  {o.items.map((it, i) => (
                    <p key={i} className="text-sm">
                      {it.name}{" "}
                      <span className="text-muted-foreground">
                        × {it.quantity}
                      </span>
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Pill}
            title="No medicines to collect"
            description="Your prescribed medicines will appear here."
          />
        )}
      </SectionCard>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink
          to="/patient/register-visit"
          icon={UserPlus}
          title="Register Visit"
        />

        <QuickLink
          to="/patient/queue"
          icon={ListOrdered}
          title="My Queue"
        />

        <QuickLink
          to="/patient/medicines"
          icon={Pill}
          title="Medicines"
        />

        <QuickLink
          to="/patient/notifications"
          icon={Bell}
          title="Notifications"
        />
      </div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, title }) {
  return (
    <Link
      to={to}
      className="card-soft group flex items-center gap-3 p-4 hover:shadow-md"
    >
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>

      <span className="text-sm font-semibold">
        {title}
      </span>
    </Link>
  );
}