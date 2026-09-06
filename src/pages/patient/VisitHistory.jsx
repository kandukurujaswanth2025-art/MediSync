import React, { useEffect, useState } from "react";
import {
  History,
  CalendarDays,
  Clock3,
  Ticket,
  Stethoscope,
} from "lucide-react";

import { useAppAuth } from "@/lib/AppAuthContext";
import { useDbVersion } from "@/hooks/useDbVersion";

import {
  PageHeader,
  SectionCard,
  EmptyState,
  LoadingState,
} from "@/components/ui-kit";

import StatusBadge from "@/components/StatusBadge";

import API_URL from "@/api/config";

export default function VisitHistory() {
  const { session, selectedHospitalId } =
    useAppAuth();

  const v = useDbVersion();

  const [visits, setVisits] =
    useState(null);

  const [hospital, setHospital] =
    useState(null);

  // ============================================================
  // GET AUTH TOKEN
  // ============================================================

  const getToken = () => {
    /*
     * IMPORTANT:
     *
     * MediSync stores authentication sessions
     * in sessionStorage, not localStorage.
     */
    const saved =
      sessionStorage.getItem(
        "medisync_session"
      );

    const data = saved
      ? JSON.parse(saved)
      : null;

    return data?.token;
  };

  // ============================================================
  // LOAD HOSPITAL
  // ============================================================

  const loadHospital = async () => {
    if (!selectedHospitalId) {
      return;
    }

    try {
      const token =
        getToken();

      const response =
        await fetch(
          `${API_URL}/hospitals/${selectedHospitalId}`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      if (!response.ok) {
        throw new Error(
          "Failed to fetch hospital"
        );
      }

      const data =
        await response.json();

      setHospital(data);

    } catch (error) {
      console.error(
        "Failed to load hospital:",
        error
      );
    }
  };

  // ============================================================
  // LOAD VISIT HISTORY
  // ============================================================

  const loadHistory = async () => {
    if (!session?.patientId) {
      return;
    }

    try {
      const token =
        getToken();

      const response =
        await fetch(
          `${API_URL}/queue/history`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      if (!response.ok) {
        throw new Error(
          "Failed to fetch visit history"
        );
      }

      const data =
        await response.json();

      /*
       * The history API now returns only:
       *
       * id
       * hospital_id
       * patient_id
       * patient_name
       * problem
       * token
       * registered_at
       * status
       * priority
       *
       * No medicines are loaded here.
       */

      const normalizedVisits =
        Array.isArray(data)
          ? data.map(
              (entry) => ({
                id: entry.id,

                hospitalId:
                  entry.hospital_id,

                patientId:
                  entry.patient_id,

                patientName:
                  entry.patient_name,

                problem:
                  entry.problem,

                token:
                  entry.token,

                registeredAt:
                  entry.registered_at,

                status:
                  entry.status,

                priority:
                  entry.priority,
              })
            )
          : [];

      setVisits(
        normalizedVisits
      );

    } catch (error) {
      console.error(
        "Failed to load visit history:",
        error
      );

      setVisits([]);
    }
  };

  // ============================================================
  // LOAD DATA
  // ============================================================

  useEffect(() => {
    loadHospital();
    loadHistory();
  }, [
    selectedHospitalId,
    session?.patientId,
    v,
  ]);

  // ============================================================
  // FORMAT DATE
  // ============================================================

  const formatDate = (
    dateValue
  ) => {
    if (!dateValue) {
      return "Date unavailable";
    }

    const date =
      new Date(dateValue);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "Date unavailable";
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  // ============================================================
  // FORMAT TIME
  // ============================================================

  const formatTime = (
    dateValue
  ) => {
    if (!dateValue) {
      return "Time unavailable";
    }

    const date =
      new Date(dateValue);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "Time unavailable";
    }

    /*
     * The backend sends registered_at as UTC.
     *
     * We DO NOT manually add 5 hours 30 minutes.
     *
     * JavaScript converts the UTC timestamp
     * into the browser's local timezone.
     */

    return date.toLocaleTimeString(
      "en-IN",
      {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }
    );
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (!visits) {
    return (
      <LoadingState
        label="Loading history…"
      />
    );
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="space-y-6">

      {/* ======================================================
          PAGE HEADER
          ====================================================== */}

      <PageHeader
        title="Visit History"
        subtitle={
          hospital
            ? hospital.name
            : "Your previous hospital visits"
        }
        icon={History}
      />

      {/* ======================================================
          VISITS
          ====================================================== */}

      {visits.length ? (

        <div className="space-y-4">

          {visits.map(
            (visit) => (

              <SectionCard
                key={visit.id}
              >

                {/* =================================================
                    VISIT HEADER
                    ================================================= */}

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                  <div className="flex items-center gap-4">

                    {/* TOKEN */}

                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">

                      <Ticket className="h-6 w-6" />

                    </div>

                    <div>

                      <div className="flex items-center gap-2">

                        <p className="font-mono text-lg font-bold text-primary">
                          {visit.token ||
                            "N/A"}
                        </p>

                        {visit.priority ===
                          "EMERGENCY" && (
                          <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-600">
                            Emergency
                          </span>
                        )}

                      </div>

                      <p className="text-sm font-medium text-foreground">
                        {visit.problem ||
                          "General consultation"}
                      </p>

                    </div>

                  </div>

                  {/* STATUS */}

                  <StatusBadge
                    status={
                      visit.status
                    }
                  />

                </div>

                {/* =================================================
                    DATE + TIME
                    ================================================= */}

                <div className="mt-5 grid gap-3 sm:grid-cols-2">

                  {/* DATE */}

                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">

                    <div className="flex items-center gap-3">

                      <div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-100 text-blue-700">

                        <CalendarDays className="h-4 w-4" />

                      </div>

                      <div>

                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Visit Date
                        </p>

                        <p className="text-sm font-bold text-foreground">
                          {formatDate(
                            visit.registeredAt
                          )}
                        </p>

                      </div>

                    </div>

                  </div>

                  {/* TIME */}

                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">

                    <div className="flex items-center gap-3">

                      <div className="grid h-9 w-9 place-items-center rounded-lg bg-amber-100 text-amber-700">

                        <Clock3 className="h-4 w-4" />

                      </div>

                      <div>

                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Visit Time
                        </p>

                        <p className="text-sm font-bold text-foreground">
                          {formatTime(
                            visit.registeredAt
                          )}
                        </p>

                      </div>

                    </div>

                  </div>

                </div>

                {/* =================================================
                    VISIT TYPE / INFORMATION
                    ================================================= */}

                <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">

                  <Stethoscope className="h-4 w-4 text-muted-foreground" />

                  <p className="text-xs text-muted-foreground">
                    Hospital consultation visit
                  </p>

                </div>

              </SectionCard>

            )
          )}

        </div>

      ) : (

        <EmptyState
          icon={History}
          title="No visits yet"
          description="Your completed and previous consultation visits will appear here."
        />

      )}

    </div>
  );
}