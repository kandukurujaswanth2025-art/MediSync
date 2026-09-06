import React, {
  useEffect,
  useState
} from "react";

import {
  PackageOpen,
  Send,
  Search,
  X,
  Trash2,
  CheckCircle2
} from "lucide-react";

import { useAppAuth } from "@/lib/AppAuthContext";

import { useDbVersion } from "@/hooks/useDbVersion";

import {
  listRequests,
  createRequest,
  searchMedicines,
  deleteRequest
} from "@/services/resourceService";

import {
  PageHeader,
  SectionCard,
  EmptyState,
  LoadingState
} from "@/components/ui-kit";

import StatusBadge from "@/components/StatusBadge";

import ConfirmDialog from "@/components/ConfirmDialog";

export default function HospitalRequests() {
  const { hospitalId } = useAppAuth();

  const v = useDbVersion();

  // --------------------------------------------------
  // REQUESTS
  // --------------------------------------------------

  const [requests, setRequests] =
    useState(null);

  // --------------------------------------------------
  // FORM
  // --------------------------------------------------

  const [form, setForm] = useState({
    resourceName: "",
    quantity: "",
    reason: ""
  });

  // --------------------------------------------------
  // MEDICINE SEARCH
  // --------------------------------------------------

  const [medicineResults, setMedicineResults] =
    useState([]);

  const [searchingMedicines, setSearchingMedicines] =
    useState(false);

  const [showMedicineResults, setShowMedicineResults] =
    useState(false);

  const [selectedMedicine, setSelectedMedicine] =
    useState(null);

  const [requestNewMedicine, setRequestNewMedicine] =
    useState(false);

  // --------------------------------------------------
  // FORM STATE
  // --------------------------------------------------

  const [busy, setBusy] =
    useState(false);

  const [sent, setSent] =
    useState(false);

  // --------------------------------------------------
  // DELETE STATE
  // --------------------------------------------------

  const [deleteTarget, setDeleteTarget] =
    useState(null);

  const [deleting, setDeleting] =
    useState(false);

  // --------------------------------------------------
  // LOAD REQUESTS
  // --------------------------------------------------

  useEffect(() => {
    let active = true;

    async function loadRequests() {
      try {
        const data =
          await listRequests(
            hospitalId
          );

        if (active) {
          setRequests(
            data || []
          );
        }
      } catch (error) {
        console.error(
          "Failed to load requests:",
          error
        );

        if (active) {
          setRequests([]);
        }
      }
    }

    if (hospitalId) {
      loadRequests();
    }

    return () => {
      active = false;
    };
  }, [
    hospitalId,
    v
  ]);

  // --------------------------------------------------
  // FORM FIELD HANDLER
  // --------------------------------------------------

  const set =
    (key) =>
    (event) => {
      const value =
        event.target.value;

      setForm(
        (current) => ({
          ...current,
          [key]: value
        })
      );
    };

  // --------------------------------------------------
  // MEDICINE SEARCH
  // --------------------------------------------------

  const handleMedicineSearch =
    async (value) => {
      setForm(
        (current) => ({
          ...current,
          resourceName: value
        })
      );

      /*
       * Once the doctor starts typing manually,
       * the previous selection is cleared.
       */
      setSelectedMedicine(null);

      /*
       * Empty search.
       */
      if (!value.trim()) {
        setMedicineResults([]);
        setShowMedicineResults(false);
        return;
      }

      /*
       * If doctor selected "Request new medicine",
       * don't show existing medicine suggestions.
       */
      if (requestNewMedicine) {
        setMedicineResults([]);
        setShowMedicineResults(false);
        return;
      }

      setSearchingMedicines(true);
      setShowMedicineResults(true);

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
  // SELECT EXISTING MEDICINE
  // --------------------------------------------------

  const handleSelectMedicine =
    (medicine) => {
      if (!medicine) return;

      setSelectedMedicine(
        medicine
      );

      setRequestNewMedicine(
        false
      );

      setForm(
        (current) => ({
          ...current,
          resourceName:
            medicine.name
        })
      );

      setMedicineResults([]);
      setShowMedicineResults(false);
    };

  // --------------------------------------------------
  // REQUEST NEW MEDICINE
  // --------------------------------------------------

  const handleRequestNewMedicine =
    () => {
      setRequestNewMedicine(
        true
      );

      setSelectedMedicine(
        null
      );

      setMedicineResults([]);
      setShowMedicineResults(false);
    };

  // --------------------------------------------------
  // CANCEL NEW MEDICINE MODE
  // --------------------------------------------------

  const handleCancelNewMedicine =
    () => {
      setRequestNewMedicine(
        false
      );

      setSelectedMedicine(
        null
      );

      setForm(
        (current) => ({
          ...current,
          resourceName: ""
        })
      );
    };

  // --------------------------------------------------
  // SUBMIT REQUEST
  // --------------------------------------------------

  const submit =
    async (event) => {
      event.preventDefault();

      /*
       * Existing medicine must be selected,
       * unless this is a new medicine request.
       */
      if (
        !requestNewMedicine &&
        !selectedMedicine
      ) {
        setShowMedicineResults(
          true
        );

        return;
      }

      setBusy(true);
      setSent(false);

      try {
        const newRequest =
          await createRequest(
            hospitalId,
            form
          );

        /*
         * Immediately add the new request
         * to the visible list.
         */
        setRequests(
          (current) => [
            newRequest,
            ...(current || [])
          ]
        );

        /*
         * Reset form.
         */
        setForm({
          resourceName: "",
          quantity: "",
          reason: ""
        });

        setSelectedMedicine(
          null
        );

        setRequestNewMedicine(
          false
        );

        setMedicineResults(
          []
        );

        setShowMedicineResults(
          false
        );

        setSent(true);

      } catch (error) {
        console.error(
          "Failed to create request:",
          error
        );

        alert(
          error.message ||
          "Failed to create request"
        );

      } finally {
        setBusy(false);
      }
    };

  // --------------------------------------------------
  // OPEN DELETE CONFIRMATION
  // --------------------------------------------------

  const handleDeleteClick =
    (request) => {
      setDeleteTarget(
        request
      );
    };

  // --------------------------------------------------
  // DELETE REQUEST
  // --------------------------------------------------

  const confirmDelete =
    async () => {
      if (!deleteTarget) return;

      setDeleting(true);

      try {
        await deleteRequest(
          deleteTarget.id
        );

        /*
         * Remove immediately from UI.
         */
        setRequests(
          (current) =>
            (current || []).filter(
              (request) =>
                request.id !==
                deleteTarget.id
            )
        );

        setDeleteTarget(null);

      } catch (error) {
        console.error(
          "Failed to delete request:",
          error
        );

        alert(
          error.message ||
          "Failed to delete request"
        );

      } finally {
        setDeleting(false);
      }
    };

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (!requests) {
    return (
      <LoadingState
        label="Loading requests…"
      />
    );
  }

  return (
    <div className="space-y-6">

      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <PageHeader
        title="Resource Requests"
        subtitle="Request stock from your resource manager"
        icon={PackageOpen}
      />

      {/* =====================================================
          MAIN CONTENT
          ===================================================== */}

      <div className="grid gap-6 lg:grid-cols-3">

        {/* ===================================================
            REQUEST FORM
            =================================================== */}

        <SectionCard
          title="Request a Resource"
          subtitle="The manager will receive this request"
          className="lg:col-span-1"
        >

          <form
            onSubmit={submit}
            className="space-y-4"
          >

            {/* -------------------------------------------------
                RESOURCE NAME
                ------------------------------------------------- */}

            <div className="relative">

              <label className="block">

                <span className="mb-1.5 block text-sm font-medium">
                  Medicine name
                </span>

                <div className="relative">

                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                  <input
                    required
                    value={
                      form.resourceName
                    }
                    onChange={(event) =>
                      handleMedicineSearch(
                        event.target.value
                      )
                    }
                    onFocus={() => {
                      if (
                        form.resourceName.trim() &&
                        !requestNewMedicine
                      ) {
                        setShowMedicineResults(
                          true
                        );
                      }
                    }}
                    className="input-base pl-9 pr-9"
                    placeholder="Search medicine..."
                  />

                  {form.resourceName && (
                    <button
                      type="button"
                      onClick={() => {
                        setForm(
                          (current) => ({
                            ...current,
                            resourceName:
                              ""
                          })
                        );

                        setSelectedMedicine(
                          null
                        );

                        setMedicineResults(
                          []
                        );

                        setShowMedicineResults(
                          false
                        );
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}

                </div>

              </label>

              {/* =================================================
                  SELECTED MEDICINE
                  ================================================= */}

              {selectedMedicine && (
                <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">

                  <div className="flex items-center justify-between gap-2">

                    <div>

                      <p className="text-sm font-semibold text-emerald-800">
                        {selectedMedicine.name}
                      </p>

                      <p className="text-xs text-emerald-700">
                        Available:
                        {" "}
                        {selectedMedicine.quantity}
                        {" "}
                        {selectedMedicine.unit || "units"}
                      </p>

                    </div>

                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />

                  </div>

                </div>
              )}

              {/* =================================================
                  NEW MEDICINE MODE
                  ================================================= */}

              {requestNewMedicine && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3">

                  <div className="flex items-start justify-between gap-3">

                    <div>

                      <p className="text-sm font-semibold text-amber-800">
                        New medicine request
                      </p>

                      <p className="mt-1 text-xs text-amber-700">
                        Enter the exact medicine name.
                        The resource manager will add it
                        to the medicine inventory when stock
                        is received.
                      </p>

                    </div>

                    <button
                      type="button"
                      onClick={
                        handleCancelNewMedicine
                      }
                      className="shrink-0 text-amber-700 hover:text-amber-900"
                      title="Cancel new medicine"
                    >
                      <X className="h-4 w-4" />
                    </button>

                  </div>

                </div>
              )}

              {/* =================================================
                  SEARCH RESULTS
                  ================================================= */}

              {showMedicineResults &&
                !requestNewMedicine && (
                  <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-xl">

                    {searchingMedicines ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Searching medicines...
                      </div>
                    ) : medicineResults.length >
                      0 ? (
                      <div className="max-h-64 overflow-y-auto">

                        {medicineResults.map(
                          (medicine) => (
                            <button
                              key={
                                medicine.id
                              }
                              type="button"
                              onClick={() =>
                                handleSelectMedicine(
                                  medicine
                                )
                              }
                              className="flex w-full items-center justify-between gap-3 border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-muted/50"
                            >

                              <div>

                                <p className="text-sm font-semibold text-foreground">
                                  {
                                    medicine.name
                                  }
                                </p>

                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  Available:
                                  {" "}
                                  {
                                    medicine.quantity
                                  }
                                  {" "}
                                  {
                                    medicine.unit ||
                                    "units"
                                  }
                                </p>

                              </div>

                              <span className="text-xs font-medium text-primary">
                                Select
                              </span>

                            </button>
                          )
                        )}

                      </div>
                    ) : (
                      <div className="p-4">

                        <p className="text-sm text-muted-foreground">
                          No existing medicine found.
                        </p>

                        <button
                          type="button"
                          onClick={
                            handleRequestNewMedicine
                          }
                          className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10"
                        >
                          + Request New Medicine
                        </button>

                      </div>
                    )}

                  </div>
                )}

            </div>

            {/* =================================================
                QUANTITY
                ================================================= */}

            <label className="block">

              <span className="mb-1.5 block text-sm font-medium">
                Quantity
              </span>

              <input
                required
                type="number"
                min="1"
                value={
                  form.quantity
                }
                onChange={
                  set("quantity")
                }
                className="input-base"
                placeholder="e.g. 20"
              />

            </label>

            {/* =================================================
                REASON
                ================================================= */}

            <label className="block">

              <span className="mb-1.5 block text-sm font-medium">
                Reason
              </span>

              <textarea
                required
                value={
                  form.reason
                }
                onChange={
                  set("reason")
                }
                rows={3}
                className="input-base"
                placeholder="Why is this needed?"
              />

            </label>

            {/* =================================================
                SEND REQUEST
                ================================================= */}

            <button
              type="submit"
              disabled={
                busy ||
                (
                  !requestNewMedicine &&
                  !selectedMedicine
                )
              }
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >

              <Send className="h-4 w-4" />

              {busy
                ? "Sending…"
                : "Send Request"}

            </button>

            {/* =================================================
                SUCCESS MESSAGE
                ================================================= */}

            {sent && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Request sent to the resource manager.
              </p>
            )}

          </form>

        </SectionCard>

        {/* ===================================================
            REQUESTS SENT
            =================================================== */}

        <SectionCard
          title="Requests Sent"
          subtitle={`${requests.length} request(s)`}
          className="lg:col-span-2"
        >

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

                      <th className="hidden px-4 py-3 sm:table-cell">
                        Reason
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

                    {requests.map(
                      (request) => (
                        <tr
                          key={
                            request.id
                          }
                          className="hover:bg-muted/30"
                        >

                          {/* Resource */}

                          <td className="px-4 py-3 font-medium">
                            {
                              request.resourceName
                            }
                          </td>

                          {/* Quantity */}

                          <td className="px-4 py-3">
                            {
                              request.quantity
                            }
                          </td>

                          {/* Reason */}

                          <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                            {
                              request.reason
                            }
                          </td>

                          {/* Status */}

                          <td className="px-4 py-3">

                            <StatusBadge
                              status={
                                request.status
                              }
                            />

                          </td>

                          {/* Delete */}

                          <td className="px-4 py-3 text-right">

                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteClick(
                                  request
                                )
                              }
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 transition hover:bg-rose-50 hover:text-rose-700"
                              title="Delete request"
                            >

                              <Trash2 className="h-4 w-4" />

                            </button>

                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>

            </div>
          ) : (
            <EmptyState
              icon={PackageOpen}
              title="No requests yet"
              description="Request a resource using the form."
            />
          )}

        </SectionCard>

      </div>

      {/* =====================================================
          DELETE CONFIRMATION
          ===================================================== */}

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
        title="Delete Request?"
        description={
          deleteTarget
            ? `Are you sure you want to delete the ${deleteTarget.resourceName} request?`
            : "Are you sure you want to delete this request?"
        }
        confirmLabel="Yes, Delete"
        tone="danger"
        loading={deleting}
      />

    </div>
  );
}