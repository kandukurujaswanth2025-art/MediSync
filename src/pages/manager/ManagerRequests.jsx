import React, { useEffect, useState } from "react";
import { ClipboardList, PlusCircle } from "lucide-react";
import { useAppAuth } from "@/lib/AppAuthContext";
import { useDbVersion } from "@/hooks/useDbVersion";
import {
  listRequests,
  fulfillRequest,
} from "@/services/resourceService";
import {
  PageHeader,
  SectionCard,
  EmptyState,
  LoadingState,
} from "@/components/ui-kit";
import StatusBadge from "@/components/StatusBadge";
import Modal from "@/components/Modal";

export default function ManagerRequests() {
  const { hospitalId } = useAppAuth();
  const v = useDbVersion();

  const [requests, setRequests] = useState(null);
  const [active, setActive] = useState(null);
  const [qty, setQty] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function loadRequests() {
      try {
        const data = await listRequests(hospitalId);

        /*
         * Only PENDING and APPROVED requests are shown.
         * Older COMPLETED/REJECTED records are hidden.
         */
        const filtered = data.filter(
          (request) =>
            request.status === "PENDING" ||
            request.status === "APPROVED"
        );

        setRequests(filtered);
      } catch (error) {
        console.error(
          "Failed to load requests:",
          error
        );

        setRequests([]);
      }
    }

    loadRequests();
  }, [hospitalId, v]);

  const addStock = async (e) => {
    e.preventDefault();

    if (!active) return;

    setBusy(true);

    try {
      const updatedRequest = await fulfillRequest(
        active.id,
        qty
      );

      /*
       * Immediately update the table.
       * No manual page refresh is required.
       */
      setRequests((currentRequests) =>
        currentRequests
          ? currentRequests.map((request) =>
              request.id === updatedRequest.id
                ? {
                    ...request,
                    ...updatedRequest,
                    status: "APPROVED",
                  }
                : request
            )
          : currentRequests
      );

      setActive(null);
      setQty("");
    } catch (error) {
      console.error(
        "Failed to fulfill request:",
        error
      );

      alert(
        error.message ||
          "Failed to add stock"
      );
    } finally {
      setBusy(false);
    }
  };

  if (!requests) {
    return (
      <LoadingState label="Loading requests…" />
    );
  }

  return (
    <div className="space-y-6">

      <PageHeader
        title="Requests"
        subtitle="Resource requests sent by your hospital"
        icon={ClipboardList}
      />

      <SectionCard>

        {requests.length ? (
          <div className="overflow-hidden rounded-xl border border-border">

            <div className="overflow-x-auto">

              <table className="w-full text-sm">

                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">
                      Resource
                    </th>

                    <th className="px-4 py-3">
                      Qty
                    </th>

                    <th className="hidden px-4 py-3 md:table-cell">
                      Reason
                    </th>

                    <th className="px-4 py-3">
                      Date
                    </th>

                    <th className="px-4 py-3">
                      Status
                    </th>

                    <th className="px-4 py-3 text-right">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">

                  {requests.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-muted/30"
                    >

                      <td className="px-4 py-3 font-medium">
                        {r.resourceName}
                      </td>

                      <td className="px-4 py-3">
                        {r.quantity}
                      </td>

                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {r.reason}
                      </td>

                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(
                          r.date
                        ).toLocaleDateString()}
                      </td>

                      <td className="px-4 py-3">
                        <StatusBadge
                          status={r.status}
                        />
                      </td>

                      <td className="px-4 py-3 text-right">

                        <button
                          onClick={() => {
                            setActive(r);

                            /*
                             * Start with the requested quantity
                             * as the suggested received quantity.
                             */
                            setQty(
                              String(
                                r.quantity
                              )
                            );
                          }}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                        >
                          Open
                        </button>

                      </td>

                    </tr>
                  ))}

                </tbody>

              </table>

            </div>

          </div>
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="No requests"
            description="Pending and approved resource requests will appear here."
          />
        )}

      </SectionCard>

      {/* =====================================================
          REQUEST DETAILS MODAL
          ===================================================== */}

      <Modal
        open={!!active}
        onClose={() => {
          if (!busy) {
            setActive(null);
            setQty("");
          }
        }}
        title="Request Details"
        description={
          active
            ? `${active.resourceName} × ${active.quantity}`
            : ""
        }
      >

        {active && (
          <div className="space-y-4">

            {/* Request information */}

            <div className="rounded-xl border border-border bg-muted/30 p-4">

              <p className="text-sm text-muted-foreground">
                Reason
              </p>

              <p className="mt-1 font-medium">
                {active.reason}
              </p>

              <div className="mt-3 flex items-center justify-between">

                <span className="text-sm text-muted-foreground">
                  Status
                </span>

                <StatusBadge
                  status={active.status}
                />

              </div>

            </div>

            {/* =================================================
                PENDING REQUEST
                ================================================= */}

            {active.status === "PENDING" && (
              <form
                onSubmit={addStock}
                className="space-y-3 rounded-xl border border-border p-4"
              >

                <p className="text-sm font-semibold">
                  Add Stock (received quantity)
                </p>

                <p className="text-xs text-muted-foreground">
                  Enter the quantity actually received.
                  This updates inventory and approves the request.
                </p>

                <label className="block">

                  <span className="mb-1.5 block text-sm font-medium">
                    Received quantity
                  </span>

                  <input
                    required
                    type="number"
                    min="1"
                    value={qty}
                    onChange={(e) =>
                      setQty(
                        e.target.value
                      )
                    }
                    className="input-base"
                    placeholder={String(
                      active.quantity
                    )}
                  />

                </label>

                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >

                  <PlusCircle className="h-4 w-4" />

                  {busy
                    ? "Updating…"
                    : "Add Stock"}

                </button>

              </form>
            )}

            {/* =================================================
                APPROVED REQUEST
                ================================================= */}

            {active.status === "APPROVED" && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">

                <p className="text-sm font-semibold text-emerald-800">
                  Request Approved
                </p>

                <p className="mt-1 text-xs text-emerald-700">
                  Stock has been received and added to inventory.
                </p>

              </div>
            )}

          </div>
        )}

      </Modal>

    </div>
  );
}