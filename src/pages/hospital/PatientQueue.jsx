import React, { useEffect, useState } from "react";
import {
  Users,
  PhoneCall,
  Play,
  Stethoscope,
  Clock,
  Search,
  Plus,
  Minus,
  Trash2,
  Send,
  CheckCircle2
} from "lucide-react";

import { useAppAuth } from "@/lib/AppAuthContext";

import {
  listQueue,
  getCurrentConsultation,
  callPatient,
  startConsultation,
  completeConsultation,
  createMedicineOrder
} from "@/services/queueService";

import { searchMedicines } from "@/services/resourceService";

import {
  PageHeader,
  SectionCard,
  EmptyState,
  LoadingState
} from "@/components/ui-kit";

import StatusBadge, {
  PriorityBadge
} from "@/components/StatusBadge";

import ConfirmDialog from "@/components/ConfirmDialog";

import { cn } from "@/lib/utils";

export default function PatientQueue() {
  const { hospitalId } = useAppAuth();

  const [queue, setQueue] = useState(null);
  const [busyId, setBusyId] = useState(null);

  // --------------------------------------------------
  // CONSULTATION STATE
  // --------------------------------------------------

  const [consultationPatient, setConsultationPatient] =
    useState(null);

  const [medicineSearch, setMedicineSearch] =
    useState("");

  const [medicineResults, setMedicineResults] =
    useState([]);

  const [selectedMedicines, setSelectedMedicines] =
    useState([]);

  const [searchingMedicines, setSearchingMedicines] =
    useState(false);

  const [sendingMedicines, setSendingMedicines] =
    useState(false);

  const [medicineListSent, setMedicineListSent] =
    useState(false);

  // --------------------------------------------------
  // CONFIRMATION DIALOG STATE
  // --------------------------------------------------

  const [confirmAction, setConfirmAction] =
    useState(null);

  // --------------------------------------------------
  // LOAD QUEUE + CURRENT CONSULTATION
  // --------------------------------------------------

  const load = async () => {
    if (!hospitalId) return;

    try {
      const [queueData, currentConsultation] =
        await Promise.all([
          listQueue(hospitalId),
          getCurrentConsultation()
        ]);

      const safeQueue = queueData || [];

      setQueue(safeQueue);

      /*
       * IMPORTANT:
       *
       * The database is the source of truth.
       *
       * If the backend says a patient is currently
       * IN_CONSULTATION, restore that patient into
       * the consultation panel after refresh.
       */

      if (
        currentConsultation &&
        currentConsultation.status ===
          "IN_CONSULTATION"
      ) {
        setConsultationPatient(
          currentConsultation
        );

        /*
         * If a medicine order already exists for
         * this consultation, the medicine list has
         * already been sent.
         */
        setMedicineListSent(
          Boolean(
            currentConsultation.medicineOrderId
          )
        );
      } else {
        /*
         * No active consultation exists.
         */
        setConsultationPatient(null);
        setMedicineListSent(false);
      }

    } catch (error) {
      console.error(
        "Failed to load hospital queue:",
        error
      );

      setQueue([]);
      setConsultationPatient(null);
      setMedicineListSent(false);
    }
  };

  useEffect(() => {
    load();
  }, [hospitalId]);

  // --------------------------------------------------
  // CALL PATIENT
  // --------------------------------------------------

  const handleCall = async (patient) => {
    if (!patient) return;

    setBusyId(patient.id);

    try {
      await callPatient(patient.id);

      await load();

    } catch (error) {
      console.error(
        "Failed to call patient:",
        error
      );

      alert(
        error.message ||
        "Failed to call patient"
      );
    } finally {
      setBusyId(null);
    }
  };

  // --------------------------------------------------
  // START CONSULTATION
  // --------------------------------------------------

  const handleStartConsultation = async (
    patient
  ) => {
    if (!patient) return;

    setBusyId(patient.id);

    try {
      const updatedPatient =
        await startConsultation(
          patient.id
        );

      setConsultationPatient(
        updatedPatient
      );

      setMedicineSearch("");
      setMedicineResults([]);
      setSelectedMedicines([]);
      setMedicineListSent(
        Boolean(
          updatedPatient?.medicineOrderId
        )
      );

      await load();

    } catch (error) {
      console.error(
        "Failed to start consultation:",
        error
      );

      alert(
        error.message ||
        "Failed to start consultation"
      );
    } finally {
      setBusyId(null);
    }
  };

  // --------------------------------------------------
  // SEARCH MEDICINES
  // --------------------------------------------------

  const handleMedicineSearch = async (
    value
  ) => {
    setMedicineSearch(value);

    /*
     * Don't send an unnecessary API request when
     * the search box is empty.
     */
    if (!value.trim()) {
      setMedicineResults([]);
      return;
    }

    if (!hospitalId) return;

    setSearchingMedicines(true);

    try {
      const results =
        await searchMedicines(
          hospitalId,
          value
        );

      setMedicineResults(
        results || []
      );

    } catch (error) {
      console.error(
        "Failed to search medicines:",
        error
      );

      setMedicineResults([]);

    } finally {
      setSearchingMedicines(false);
    }
  };

  // --------------------------------------------------
  // ADD MEDICINE
  // --------------------------------------------------

  const addMedicine = (medicine) => {
    if (!medicine) return;

    const alreadySelected =
      selectedMedicines.find(
        (item) =>
          item.medicineId ===
          medicine.id
      );

    if (alreadySelected) {
      setSelectedMedicines(
        (current) =>
          current.map((item) =>
            item.medicineId ===
            medicine.id
              ? {
                  ...item,
                  quantity:
                    Number(
                      item.quantity
                    ) + 1
                }
              : item
          )
      );

      return;
    }

    setSelectedMedicines(
      (current) => [
        ...current,
        {
          medicineId: medicine.id,
          name: medicine.name,
          quantity: 1,
          availableStock:
            Number(
              medicine.quantity
            )
        }
      ]
    );
  };

  // --------------------------------------------------
  // CHANGE MEDICINE QUANTITY
  // --------------------------------------------------

  const changeQuantity = (
    medicineId,
    change
  ) => {
    setSelectedMedicines(
      (current) =>
        current.map((item) => {
          if (
            item.medicineId !==
            medicineId
          ) {
            return item;
          }

          const newQuantity =
            Number(
              item.quantity
            ) + change;

          if (newQuantity < 1) {
            return item;
          }

          if (
            newQuantity >
            Number(
              item.availableStock
            )
          ) {
            return item;
          }

          return {
            ...item,
            quantity:
              newQuantity
          };
        })
    );
  };

  // --------------------------------------------------
  // REMOVE MEDICINE
  // --------------------------------------------------

  const removeMedicine = (
    medicineId
  ) => {
    setSelectedMedicines(
      (current) =>
        current.filter(
          (item) =>
            item.medicineId !==
            medicineId
        )
    );
  };

  // --------------------------------------------------
  // OPEN SEND MEDICINE CONFIRMATION
  // --------------------------------------------------

  const handleSendMedicineList = () => {
    if (!consultationPatient) return;

    setConfirmAction(
      "SEND_MEDICINES"
    );
  };

  // --------------------------------------------------
  // ACTUALLY SEND MEDICINE LIST
  // --------------------------------------------------

  const confirmSendMedicineList =
    async () => {
      if (!consultationPatient)
        return;

      setSendingMedicines(true);

      try {
        await createMedicineOrder(
          hospitalId,
          consultationPatient,
          selectedMedicines
        );

        setMedicineListSent(
          true
        );

        setConfirmAction(null);

        /*
         * Reload from backend so the
         * medicine_order_id is now reflected
         * in the consultation state.
         */
        await load();

      } catch (error) {
        console.error(
          "Failed to send medicine list:",
          error
        );

        setConfirmAction(null);

        alert(
          error.message ||
          "Failed to send medicine list"
        );

      } finally {
        setSendingMedicines(
          false
        );
      }
    };

  // --------------------------------------------------
  // OPEN END SESSION CONFIRMATION
  // --------------------------------------------------

  const handleEndSession = () => {
    if (!consultationPatient)
      return;

    if (!medicineListSent) {
      alert(
        "Please send the medicine list before ending the session."
      );

      return;
    }

    setConfirmAction(
      "END_SESSION"
    );
  };

  // --------------------------------------------------
  // ACTUALLY END SESSION
  // --------------------------------------------------

  const confirmEndSession =
    async () => {
      if (!consultationPatient)
        return;

      setBusyId(
        consultationPatient.id
      );

      try {
        await completeConsultation(
          consultationPatient.id
        );

        setConfirmAction(null);

        setConsultationPatient(
          null
        );

        setMedicineSearch("");
        setMedicineResults([]);
        setSelectedMedicines([]);
        setMedicineListSent(
          false
        );

        await load();

      } catch (error) {
        console.error(
          "Failed to end consultation:",
          error
        );

        setConfirmAction(null);

        alert(
          error.message ||
          "Failed to end consultation"
        );

      } finally {
        setBusyId(null);
      }
    };

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (!queue) {
    return (
      <LoadingState
        label="Loading queue…"
      />
    );
  }

  // --------------------------------------------------
  // ACTIVE QUEUE
  // --------------------------------------------------

  const activeQueue =
    queue.filter(
      (patient) =>
        patient.status !==
        "COMPLETED"
    );

  // --------------------------------------------------
  // FIRST WAITING PATIENT
  // --------------------------------------------------

  const firstWaitingPatient =
    activeQueue.find(
      (patient) =>
        patient.status ===
        "WAITING"
    );

  // --------------------------------------------------
  // CURRENTLY ACTIVE PATIENT
  // --------------------------------------------------

  const activePatient =
    activeQueue.find(
      (patient) =>
        patient.status ===
          "CALLED" ||
        patient.status ===
          "IN_CONSULTATION"
    );

  return (
    <div className="space-y-6">

      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <PageHeader
        title="Patient Queue"
        subtitle="Live hospital queue — emergency patients first"
        icon={Users}
      />

      {/* =====================================================
          CONSULTATION PANEL
          ===================================================== */}

      {consultationPatient && (
        <SectionCard
          title="Patient Consultation"
          subtitle="Complete the consultation before ending the session."
        >
          <div className="space-y-6">

            {/* -------------------------------------------------
                PATIENT INFORMATION
                ------------------------------------------------- */}

            <div
              className={cn(
                "rounded-2xl border-2 p-5",
                consultationPatient.priority ===
                  "EMERGENCY"
                  ? "border-red-300 bg-red-50"
                  : "border-indigo-200 bg-indigo-50"
              )}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                <div>

                  <div className="flex flex-wrap items-center gap-2">

                    <span
                      className={cn(
                        "font-mono text-3xl font-bold",
                        consultationPatient.priority ===
                          "EMERGENCY"
                          ? "text-red-700"
                          : "text-primary"
                      )}
                    >
                      {
                        consultationPatient.token
                      }
                    </span>

                    {consultationPatient.priority ===
                      "EMERGENCY" && (
                      <PriorityBadge
                        priority="EMERGENCY"
                      />
                    )}

                    <StatusBadge
                      status={
                        consultationPatient.status
                      }
                    />

                  </div>

                  <p className="mt-2 text-xl font-bold">
                    {
                      consultationPatient.patientName
                    }
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Problem:{" "}
                    {
                      consultationPatient.problem
                    }
                  </p>

                </div>

                <div className="flex items-center gap-2 rounded-xl bg-indigo-100 px-4 py-3 text-sm font-semibold text-indigo-700">

                  <Stethoscope className="h-5 w-5" />

                  Consultation in progress

                </div>

              </div>
            </div>

            {/* =================================================
                MEDICINE SEARCH
                ================================================= */}

            <div className="space-y-3">

              <div>

                <h3 className="text-base font-semibold">
                  Medicines
                </h3>

                <p className="text-sm text-muted-foreground">
                  Search the hospital medicine inventory
                  and add medicines for this patient.
                </p>

              </div>

              <div className="relative">

                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <input
                  type="text"
                  value={
                    medicineSearch
                  }
                  onChange={(event) =>
                    handleMedicineSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search medicines..."
                  disabled={
                    medicineListSent
                  }
                  className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                />

              </div>

              {/* Search Results */}

              {medicineSearch && (
                <div className="rounded-xl border border-border bg-background shadow-sm">

                  {searchingMedicines ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Searching medicines...
                    </div>
                  ) : medicineResults.length ===
                    0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No medicines found.
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto divide-y divide-border">

                      {medicineResults.map(
                        (medicine) => (
                          <div
                            key={
                              medicine.id
                            }
                            className="flex items-center justify-between gap-4 p-4"
                          >

                            <div>

                              <p className="font-semibold">
                                {
                                  medicine.name
                                }
                              </p>

                              <p className="text-xs text-muted-foreground">
                                Available:{" "}
                                {
                                  medicine.quantity
                                }{" "}
                                {
                                  medicine.unit ||
                                  "units"
                                }
                              </p>

                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                addMedicine(
                                  medicine
                                )
                              }
                              disabled={
                                medicineListSent ||
                                Number(
                                  medicine.quantity
                                ) <= 0
                              }
                              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                            >

                              <Plus className="h-4 w-4" />

                              Add

                            </button>

                          </div>
                        )
                      )}

                    </div>
                  )}

                </div>
              )}

            </div>

            {/* =================================================
                SELECTED MEDICINES
                ================================================= */}

            <div className="space-y-3">

              <div className="flex items-center justify-between">

                <h3 className="text-base font-semibold">
                  Selected Medicines
                </h3>

                <span className="text-xs text-muted-foreground">
                  {
                    selectedMedicines.length
                  }{" "}
                  item(s)
                </span>

              </div>

              {selectedMedicines.length ===
              0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">

                  No medicines selected.

                  <br />

                  If no medicine is required, you can
                  send an empty medicine list.

                </div>
              ) : (
                <div className="space-y-2">

                  {selectedMedicines.map(
                    (medicine) => (
                      <div
                        key={
                          medicine.medicineId
                        }
                        className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                      >

                        <div>

                          <p className="font-semibold">
                            {
                              medicine.name
                            }
                          </p>

                          <p className="text-xs text-muted-foreground">
                            Available stock:{" "}
                            {
                              medicine.availableStock
                            }
                          </p>

                        </div>

                        <div className="flex items-center gap-2">

                          <button
                            type="button"
                            onClick={() =>
                              changeQuantity(
                                medicine.medicineId,
                                -1
                              )
                            }
                            disabled={
                              medicineListSent ||
                              medicine.quantity <=
                                1
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Minus className="h-4 w-4" />
                          </button>

                          <span className="flex h-9 min-w-10 items-center justify-center rounded-lg bg-muted px-3 text-sm font-bold">
                            {
                              medicine.quantity
                            }
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              changeQuantity(
                                medicine.medicineId,
                                1
                              )
                            }
                            disabled={
                              medicineListSent ||
                              medicine.quantity >=
                                medicine.availableStock
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Plus className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              removeMedicine(
                                medicine.medicineId
                              )
                            }
                            disabled={
                              medicineListSent
                            }
                            className="ml-2 flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>

                        </div>

                      </div>
                    )
                  )}

                </div>
              )}

            </div>

            {/* =================================================
                CONSULTATION ACTIONS
                ================================================= */}

            <div className="border-t border-border pt-5">

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">

                {!medicineListSent ? (
                  <button
                    type="button"
                    onClick={
                      handleSendMedicineList
                    }
                    disabled={
                      sendingMedicines
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >

                    <Send className="h-4 w-4" />

                    {sendingMedicines
                      ? "Sending..."
                      : "Send Medicine List"}

                  </button>
                ) : (
                  <div className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-100 px-5 py-3 text-sm font-semibold text-green-700">

                    <CheckCircle2 className="h-4 w-4" />

                    Medicine List Sent

                  </div>
                )}

                <button
                  type="button"
                  onClick={
                    handleEndSession
                  }
                  disabled={
                    !medicineListSent ||
                    busyId ===
                      consultationPatient.id
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >

                  <CheckCircle2 className="h-4 w-4" />

                  {busyId ===
                  consultationPatient.id
                    ? "Ending..."
                    : "End Session"}

                </button>

              </div>

              {!medicineListSent && (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Send the medicine list before ending
                  the consultation.
                </p>
              )}

            </div>

          </div>
        </SectionCard>
      )}

      {/* =====================================================
          PATIENT QUEUE
          ===================================================== */}

      <SectionCard
        title="Patient Queue"
        subtitle={`${activeQueue.length} active patient(s)`}
      >

        {activeQueue.length ? (
          <div className="space-y-3">

            {activeQueue.map(
              (patient, index) => {

                const isCalled =
                  patient.status ===
                  "CALLED";

                const isInConsultation =
                  patient.status ===
                  "IN_CONSULTATION";

                const isFirstWaiting =
                  firstWaitingPatient?.id ===
                  patient.id;

                const isBusy =
                  busyId === patient.id;

                // --------------------------------------------
                // CALLED PATIENT
                // --------------------------------------------

                if (isCalled) {
                  return (
                    <div
                      key={
                        patient.id
                      }
                      className={cn(
                        "rounded-2xl border-2 p-5 shadow-sm",
                        patient.priority ===
                          "EMERGENCY"
                          ? "border-red-300 bg-red-50"
                          : "border-sky-300 bg-sky-50"
                      )}
                    >

                      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

                        <div className="space-y-3">

                          <div className="flex flex-wrap items-center gap-2">

                            <span
                              className={cn(
                                "font-mono text-3xl font-bold",
                                patient.priority ===
                                  "EMERGENCY"
                                  ? "text-red-700"
                                  : "text-primary"
                              )}
                            >
                              {
                                patient.token
                              }
                            </span>

                            {patient.priority ===
                              "EMERGENCY" && (
                              <PriorityBadge
                                priority="EMERGENCY"
                              />
                            )}

                            <StatusBadge
                              status={
                                patient.status
                              }
                            />

                          </div>

                          <div>

                            <p className="text-xl font-bold">
                              {
                                patient.patientName
                              }
                            </p>

                            <p className="mt-1 text-sm text-muted-foreground">
                              Problem:{" "}
                              {
                                patient.problem
                              }
                            </p>

                          </div>

                        </div>

                        <div className="flex shrink-0 flex-col items-stretch gap-2 md:items-end">

                          <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                            Patient Called
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleStartConsultation(
                                patient
                              )
                            }
                            disabled={
                              isBusy ||
                              !!consultationPatient
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                          >

                            <Play className="h-4 w-4" />

                            {isBusy
                              ? "Starting..."
                              : "Start Consultation"}

                          </button>

                        </div>

                      </div>

                    </div>
                  );
                }

                // --------------------------------------------
                // IN CONSULTATION PATIENT
                // --------------------------------------------

                if (
                  isInConsultation
                ) {
                  return (
                    <div
                      key={
                        patient.id
                      }
                      className="rounded-2xl border-2 border-indigo-300 bg-indigo-50 p-5 shadow-sm"
                    >

                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                        <div>

                          <div className="flex flex-wrap items-center gap-2">

                            <span className="font-mono text-3xl font-bold text-indigo-700">
                              {
                                patient.token
                              }
                            </span>

                            {patient.priority ===
                              "EMERGENCY" && (
                              <PriorityBadge
                                priority="EMERGENCY"
                              />
                            )}

                            <StatusBadge
                              status={
                                patient.status
                              }
                            />

                          </div>

                          <p className="mt-2 text-xl font-bold">
                            {
                              patient.patientName
                            }
                          </p>

                          <p className="mt-1 text-sm text-muted-foreground">
                            Problem:{" "}
                            {
                              patient.problem
                            }
                          </p>

                        </div>

                        <div className="flex items-center gap-2 rounded-xl bg-indigo-100 px-4 py-3 text-sm font-semibold text-indigo-700">

                          <Stethoscope className="h-5 w-5" />

                          Consultation in progress

                        </div>

                      </div>

                    </div>
                  );
                }

                // --------------------------------------------
                // WAITING PATIENT
                // --------------------------------------------

                return (
                  <div
                    key={
                      patient.id
                    }
                    className={cn(
                      "rounded-xl border p-4 transition",
                      patient.priority ===
                        "EMERGENCY"
                        ? "border-red-200 bg-red-50/70"
                        : "border-border bg-background",
                      isFirstWaiting &&
                        "ring-2 ring-primary/20"
                    )}
                  >

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                      <div className="flex min-w-0 items-center gap-4">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold">
                          #{index + 1}
                        </div>

                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-2">

                            <span
                              className={cn(
                                "font-mono text-xl font-bold",
                                patient.priority ===
                                  "EMERGENCY"
                                  ? "text-red-700"
                                  : "text-primary"
                              )}
                            >
                              {
                                patient.token
                              }
                            </span>

                            {patient.priority ===
                              "EMERGENCY" && (
                              <PriorityBadge
                                priority="EMERGENCY"
                              />
                            )}

                            <StatusBadge
                              status={
                                patient.status
                              }
                            />

                          </div>

                          <p className="mt-1 font-semibold">
                            {
                              patient.patientName
                            }
                          </p>

                          <p className="text-sm text-muted-foreground">
                            {
                              patient.problem
                            }
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            Registered at{" "}
                            {new Date(
                              patient.registeredAt
                            ).toLocaleTimeString()}
                          </p>

                        </div>

                      </div>

                      <div className="shrink-0 lg:w-40">

                        {isFirstWaiting ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleCall(
                                patient
                              )
                            }
                            disabled={
                              isBusy ||
                              !!activePatient ||
                              !!consultationPatient
                            }
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >

                            <PhoneCall className="h-4 w-4" />

                            {isBusy
                              ? "Calling..."
                              : "Call"}

                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-green-100 px-4 py-2.5 text-sm font-semibold text-green-700 opacity-80"
                          >

                            <Clock className="h-4 w-4" />

                            Waiting

                          </button>
                        )}

                      </div>

                    </div>

                  </div>
                );
              }
            )}

          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="No patients in queue"
            description="There are currently no active patients."
          />
        )}

      </SectionCard>

      {/* =====================================================
          CONFIRMATION DIALOG
          ===================================================== */}

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() =>
          setConfirmAction(null)
        }
        onConfirm={
          confirmAction ===
          "SEND_MEDICINES"
            ? confirmSendMedicineList
            : confirmEndSession
        }
        title={
          confirmAction ===
          "SEND_MEDICINES"
            ? "Send Medicine List?"
            : "End Consultation?"
        }
        description={
          confirmAction ===
          "SEND_MEDICINES"
            ? "Are you sure you want to send the selected medicines to this patient?"
            : "Are you sure you want to end this consultation?"
        }
        confirmLabel={
          confirmAction ===
          "SEND_MEDICINES"
            ? "Yes, Send List"
            : "Yes, End Session"
        }
        tone={
          confirmAction ===
          "SEND_MEDICINES"
            ? "primary"
            : "danger"
        }
        loading={
          sendingMedicines ||
          busyId ===
            consultationPatient?.id
        }
      />

    </div>
  );
}