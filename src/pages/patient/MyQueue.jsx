import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ListOrdered,
  Clock,
  Stethoscope,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

import { useAppAuth } from "@/lib/AppAuthContext";

import {
  getMyQueueEntry,
  getQueuePosition,
} from "@/services/queueService";

import {
  PageHeader,
  SectionCard,
  EmptyState,
  LoadingState,
} from "@/components/ui-kit";

import StatusBadge from "@/components/StatusBadge";

import API_URL from "@/api/config";

const STEPS = [
  "WAITING",
  "CALLED",
  "IN_CONSULTATION",
  "COMPLETED",
];

export default function MyQueue() {
  const { session, selectedHospitalId } = useAppAuth();

  const [entry, setEntry] = useState(null);
  const [current, setCurrent] = useState(null);
  const [position, setPosition] = useState(null);
  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(true);

  // --------------------------------------------------
  // INITIAL LOAD
  // --------------------------------------------------

  useEffect(() => {
    if (
      !selectedHospitalId ||
      !session?.patientId
    ) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadInitial() {
      try {
        setLoading(true);

        const [
          hospitalResponse,
          myEntry,
        ] = await Promise.all([
          fetch(
            `${API_URL}/hospitals/${selectedHospitalId}`
          ),

          getMyQueueEntry(
            selectedHospitalId,
            session.patientId
          ),
        ]);

        if (cancelled) return;

        // Hospital information
        if (hospitalResponse.ok) {
          const hospitalData =
            await hospitalResponse.json();

          setHospital(hospitalData);
        }

        // Patient queue entry
        setEntry(myEntry);

        // Queue position
        if (myEntry?.status === "WAITING") {
          const positionData =
            await getQueuePosition(
              myEntry.id
            );

          if (!cancelled) {
            setPosition({
              position: Number(
                positionData.position || 0
              ),

              patientsAhead: Number(
                positionData.patientsAhead || 0
              ),

              estimatedMinutes: Number(
                positionData.estimatedWaitMinutes ||
                  0
              ),
            });
          }
        } else {
          setPosition(null);
        }

        // Currently serving is intentionally
        // not populated here.
        setCurrent(null);

      } catch (error) {
        console.error(
          "Queue loading error:",
          error
        );

        if (!cancelled) {
          setEntry(null);
          setPosition(null);
          setCurrent(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInitial();

    return () => {
      cancelled = true;
    };
  }, [
    selectedHospitalId,
    session?.patientId,
  ]);

  // --------------------------------------------------
  // CHECK QUEUE STATUS
  // --------------------------------------------------
  //
  // The global doctor-call popup is now handled
  // by DashboardLayout.jsx.
  //
  // This polling is only used here to keep the
  // My Queue page's token/status/position updated.
  // --------------------------------------------------

  useEffect(() => {
    if (
      !selectedHospitalId ||
      !session?.patientId
    ) {
      return;
    }

    let cancelled = false;

    async function checkQueueStatus() {
      try {
        const myEntry =
          await getMyQueueEntry(
            selectedHospitalId,
            session.patientId
          );

        if (cancelled) return;

        setEntry(myEntry);

        // Update queue position while waiting.
        if (myEntry?.status === "WAITING") {
          const positionData =
            await getQueuePosition(
              myEntry.id
            );

          if (!cancelled) {
            setPosition({
              position: Number(
                positionData.position || 0
              ),

              patientsAhead: Number(
                positionData.patientsAhead || 0
              ),

              estimatedMinutes: Number(
                positionData.estimatedWaitMinutes ||
                  0
              ),
            });
          }
        } else {
          setPosition(null);
        }

      } catch (error) {
        console.error(
          "Queue status check error:",
          error
        );
      }
    }

    checkQueueStatus();

    const interval = setInterval(
      checkQueueStatus,
      2000
    );

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [
    selectedHospitalId,
    session?.patientId,
  ]);

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <LoadingState label="Loading your queue…" />
    );
  }

  const stepIndex = entry
    ? STEPS.indexOf(entry.status)
    : -1;

  /*
   * The global popup in DashboardLayout stores
   * acknowledgement in sessionStorage.
   *
   * My Queue only needs to know whether the patient
   * acknowledged the current call so it can display
   * the "Coming..." status.
   */
  const isAcknowledged =
    entry?.status === "CALLED" &&
    sessionStorage.getItem(
      `medisync_call_ack_${entry.id}`
    ) === "true";

  return (
    <div className="space-y-6">

      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <PageHeader
        title="My Queue"
        subtitle={
          hospital ? hospital.name : ""
        }
        icon={ListOrdered}
      />

      {!entry ? (
        <EmptyState
          icon={ListOrdered}
          title="You are not in the queue"
          description="Register for a consultation to get your token."
          action={
            <Link
              to="/patient/register-visit"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Register visit
            </Link>
          }
        />
      ) : (
        <>
          {/* =================================================
              TOKEN + QUEUE INFORMATION
          ================================================= */}

          <div className="grid gap-6 lg:grid-cols-2">

            {/* ============================
                YOUR TOKEN
            ============================ */}

            <SectionCard title="Your Token">

              <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary to-[hsl(221_47%_30%)] p-6 text-primary-foreground">

                <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-teal-400/20 blur-3xl" />

                <div className="relative">

                  <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/70">
                    Token
                  </p>

                  <p className="mt-1 font-mono text-4xl font-bold">
                    {entry.token}
                  </p>

                  <p className="mt-1 text-sm text-primary-foreground/80">
                    {entry.problem}
                  </p>

                  <div className="mt-3">
                    <StatusBadge
                      status={entry.status}
                    />
                  </div>

                  {entry.priority ===
                    "EMERGENCY" && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
                      🚨 EMERGENCY PRIORITY
                    </div>
                  )}

                  {/* ==============================
                      COMING STATUS
                  ============================== */}

                  {entry.status ===
                    "CALLED" &&
                    isAcknowledged && (
                      <div className="mt-5 rounded-xl border border-blue-300/30 bg-blue-500/20 px-4 py-4">

                        <div className="flex items-center gap-3">

                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-400/20">
                            <ArrowRight className="h-5 w-5" />
                          </div>

                          <div>
                            <p className="text-base font-bold">
                              Coming...
                            </p>

                            <p className="mt-0.5 text-xs text-primary-foreground/70">
                              You acknowledged the doctor's call.
                            </p>
                          </div>

                        </div>

                      </div>
                    )}

                </div>
              </div>

            </SectionCard>

            {/* ============================
                QUEUE INFORMATION
            ============================ */}

            <SectionCard title="Queue Information">

              <div className="grid grid-cols-2 gap-3">

                <Info
                  icon={AlertTriangle}
                  label="Priority"
                  value={
                    entry.priority ===
                    "EMERGENCY" ? (
                      <span className="font-bold text-red-600">
                        🚨 EMERGENCY
                      </span>
                    ) : (
                      "Normal"
                    )
                  }
                />

                <Info
                  icon={Stethoscope}
                  label="Current serving"
                  value={
                    current
                      ? current.token
                      : "—"
                  }
                />

                <Info
                  icon={ListOrdered}
                  label="Your position"
                  value={
                    entry.status ===
                    "WAITING"
                      ? `#${
                          position?.position ||
                          0
                        }`
                      : "—"
                  }
                />

                <Info
                  icon={ListOrdered}
                  label="Patients ahead"
                  value={
                    entry.status ===
                    "WAITING"
                      ? position?.patientsAhead ||
                        0
                      : "—"
                  }
                />

                <Info
                  icon={Clock}
                  label="Est. waiting time"
                  value={
                    entry.status ===
                    "WAITING"
                      ? `~${
                          position?.estimatedMinutes ||
                          0
                        } min`
                      : "—"
                  }
                />

              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Estimated waiting time = patients
                ahead × ~10 min per consultation.
                This is an estimate, not an exact
                prediction.
              </p>

            </SectionCard>

          </div>

          {/* =================================================
              CONSULTATION PROGRESS
          ================================================= */}

          <SectionCard title="Consultation Progress">

            <div className="flex items-center justify-between">

              {STEPS.map((s, i) => {

                const done =
                  i <= stepIndex;

                return (
                  <div
                    key={s}
                    className="flex flex-1 flex-col items-center"
                  >

                    <div className="flex w-full items-center">

                      <div
                        className={`h-1 flex-1 ${
                          i > 0
                            ? done
                              ? "bg-teal-500"
                              : "bg-border"
                            : "bg-transparent"
                        }`}
                      />

                      <div
                        className={`grid h-9 w-9 place-items-center rounded-full border-2 ${
                          done
                            ? "border-teal-500 bg-teal-500 text-white"
                            : "border-border bg-card text-muted-foreground"
                        }`}
                      >
                        {done
                          ? "✓"
                          : i + 1}
                      </div>

                      <div
                        className={`h-1 flex-1 ${
                          i <
                          STEPS.length - 1
                            ? stepIndex > i
                              ? "bg-teal-500"
                              : "bg-border"
                            : "bg-transparent"
                        }`}
                      />

                    </div>

                    <p
                      className={`mt-2 text-center text-xs font-medium ${
                        done
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {s.replace(
                        /_/g,
                        " "
                      )}
                    </p>

                  </div>
                );
              })}

            </div>

          </SectionCard>

          {/* =================================================
              AFTER PATIENT CLICKS I'M GOING
          ================================================= */}

          {entry.status === "CALLED" &&
            isAcknowledged && (
              <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-5 text-center">

                <p className="text-base font-semibold text-sky-800">
                  You are on your way
                </p>

                <p className="text-sm text-sky-700">
                  Please proceed to the consultation area.
                </p>

              </div>
            )}

          {/* =================================================
              COMPLETED
          ================================================= */}

          {entry.status === "COMPLETED" && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 text-center">

              <p className="text-base font-semibold text-emerald-800">
                Consultation completed
              </p>

              <p className="text-sm text-emerald-700">
                Check the Medicines section for anything to collect.
              </p>

            </div>
          )}
        </>
      )}
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3">

      <Icon className="h-4 w-4 text-muted-foreground" />

      <p className="mt-1 text-lg font-bold">
        {value}
      </p>

      <p className="text-[11px] text-muted-foreground">
        {label}
      </p>

    </div>
  );
}