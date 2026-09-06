import React, { useEffect, useState } from "react";
import {
  Pill,
  Trash2,
  CalendarDays,
  Clock3,
  Ticket,
} from "lucide-react";

import { useAppAuth } from "@/lib/AppAuthContext";
import { useDbVersion } from "@/hooks/useDbVersion";

import {
  listMedicineOrdersForPatient,
  deleteMedicineOrder,
} from "@/services/queueService";

import {
  PageHeader,
  SectionCard,
  EmptyState,
  LoadingState,
} from "@/components/ui-kit";

import StatusBadge from "@/components/StatusBadge";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function PatientMedicines() {
  const { session } = useAppAuth();
  const v = useDbVersion();

  const [orders, setOrders] = useState(null);

  const [deleteTarget, setDeleteTarget] =
    useState(null);

  const [deleting, setDeleting] =
    useState(false);

  // ============================================================
  // LOAD MEDICINE ORDERS
  // ============================================================

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      try {
        const data =
          await listMedicineOrdersForPatient(
            session.patientId
          );

        if (active) {
          setOrders(data || []);
        }
      } catch (error) {
        console.error(
          "Failed to load medicines:",
          error
        );

        if (active) {
          setOrders([]);
        }
      }
    }

    if (session?.patientId) {
      loadOrders();
    }

    return () => {
      active = false;
    };
  }, [
    session?.patientId,
    v,
  ]);

  // ============================================================
  // DELETE CLICK
  // ============================================================

  const handleDeleteClick = (order) => {
    setDeleteTarget(order);
  };

  // ============================================================
  // CONFIRM DELETE
  // ============================================================

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);

    try {
      await deleteMedicineOrder(
        deleteTarget.id
      );

      // Remove the deleted card immediately
      setOrders((current) =>
        (current || []).filter(
          (order) =>
            order.id !== deleteTarget.id
        )
      );

      setDeleteTarget(null);

    } catch (error) {
      console.error(
        "Failed to delete medicine order:",
        error
      );

      alert(
        error.message ||
        "Failed to delete medicine list"
      );

    } finally {
      setDeleting(false);
    }
  };

  // ============================================================
  // DATE FORMAT
  // ============================================================

  const formatDate = (dateValue) => {
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
  // TIME FORMAT
  // ============================================================

  const formatTime = (dateValue) => {
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
     * IMPORTANT:
     *
     * No manual +5:30 calculation is done here.
     *
     * The backend sends the timestamp as UTC.
     * JavaScript automatically converts it to
     * the browser's local timezone.
     *
     * en-IN therefore displays Indian time (IST)
     * when the browser/system is set to India.
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

  if (!orders) {
    return (
      <LoadingState
        label="Loading medicines…"
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
        title="Medicine List"
        subtitle="Medicines prescribed and ready for collection"
        icon={Pill}
      />

      {/* ======================================================
          MEDICINE LIST
          ====================================================== */}

      {orders.length ? (

        <div className="space-y-4">

          {orders.map((order) => (

            <SectionCard
              key={order.id}
              title="Medicine List"
              subtitle="Prescription details"
              actions={
                <div className="flex items-center gap-2">

                  <StatusBadge
                    status={order.status}
                  />

                  {/* DELETE BUTTON */}

                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteClick(
                        order
                      )
                    }
                    title="Delete medicine list"
                    aria-label="Delete medicine list"
                    className="grid h-8 w-8 place-items-center rounded-lg text-rose-600 transition hover:bg-rose-50 hover:text-rose-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                </div>
              }
            >

              {/* =================================================
                  PRESCRIPTION INFORMATION
                  ================================================= */}

              <div className="mb-5 grid gap-3 sm:grid-cols-3">

                {/* TOKEN */}

                <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">

                  <div className="flex items-center gap-2">

                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Ticket className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Token Number
                      </p>

                      <p className="text-base font-bold text-primary">
                        {order.token || "N/A"}
                      </p>
                    </div>

                  </div>

                </div>

                {/* DATE */}

                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">

                  <div className="flex items-center gap-2">

                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-100 text-blue-700">
                      <CalendarDays className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Date
                      </p>

                      <p className="text-sm font-bold text-foreground">
                        {formatDate(
                          order.createdAt
                        )}
                      </p>
                    </div>

                  </div>

                </div>

                {/* TIME */}

                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">

                  <div className="flex items-center gap-2">

                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-100 text-amber-700">
                      <Clock3 className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Time
                      </p>

                      <p className="text-sm font-bold text-foreground">
                        {formatTime(
                          order.createdAt
                        )}
                      </p>

                    </div>

                  </div>

                </div>

              </div>

              {/* =================================================
                  MEDICINES
                  ================================================= */}

              <div className="space-y-2">

                {order.items.map(
                  (item, index) => (

                    <div
                      key={
                        item.medicineId ||
                        index
                      }
                      className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
                    >

                      <div className="flex items-center gap-3">

                        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">

                          <Pill className="h-4 w-4" />

                        </span>

                        <p className="text-sm font-medium">
                          {item.name}
                        </p>

                      </div>

                      <p className="text-sm font-semibold">
                        Quantity:{" "}
                        {item.quantity}
                      </p>

                    </div>

                  )
                )}

              </div>

            </SectionCard>

          ))}

        </div>

      ) : (

        <EmptyState
          icon={Pill}
          title="No medicines yet"
          description="Medicines prescribed by your doctor will appear here."
        />

      )}

      {/* ========================================================
          DELETE CONFIRMATION
          ======================================================== */}

      <ConfirmDialog
        open={
          !!deleteTarget
        }
        onClose={() =>
          setDeleteTarget(null)
        }
        onConfirm={
          confirmDelete
        }
        title="Delete Medicine List?"
        description={
          deleteTarget
            ? `Are you sure you want to delete the medicine list for token ${deleteTarget.token || "N/A"}?`
            : "Are you sure you want to delete this medicine list?"
        }
        confirmLabel="Yes, Delete"
        tone="danger"
        loading={deleting}
      />

    </div>
  );
}