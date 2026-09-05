import React, { useEffect, useState } from "react";
import { ClipboardList, PlusCircle } from "lucide-react";
import { useAppAuth } from "@/lib/AppAuthContext";
import { useDbVersion } from "@/hooks/useDbVersion";
import { listRequests, updateRequestStatus, fulfillRequest } from "@/services/resourceService";
import { PageHeader, SectionCard, EmptyState, LoadingState } from "@/components/ui-kit";
import StatusBadge from "@/components/StatusBadge";
import Modal from "@/components/Modal";

export default function ManagerRequests() {
  const { hospitalId } = useAppAuth();
  const v = useDbVersion();
  const [requests, setRequests] = useState(null);
  const [active, setActive] = useState(null);
  const [qty, setQty] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { listRequests(hospitalId).then(setRequests); }, [hospitalId, v]);

  const approve = async (id) => { await updateRequestStatus(id, "APPROVED"); };
  const addStock = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await fulfillRequest(active.id, qty); setActive(null); setQty(""); } finally { setBusy(false); }
  };

  if (!requests) return <LoadingState label="Loading requests…" />;

  return (
    <div className="space-y-6">
      <PageHeader title="Requests" subtitle="Resource requests sent by your hospital" icon={ClipboardList} />

      <SectionCard>
        {requests.length ? (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr><th className="px-4 py-3">Resource</th><th className="px-4 py-3">Qty</th><th className="hidden px-4 py-3 md:table-cell">Reason</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {requests.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{r.resourceName}</td>
                      <td className="px-4 py-3">{r.quantity}</td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{r.reason}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setActive(r)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">Open</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState icon={ClipboardList} title="No requests" description="Requests from the hospital will appear here." />
        )}
      </SectionCard>

      <Modal open={!!active} onClose={() => setActive(null)} title="Request Details" description={active ? `${active.resourceName} × ${active.quantity}` : ""}>
        {active && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">Reason</p>
              <p className="mt-1 font-medium">{active.reason}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <StatusBadge status={active.status} />
              </div>
            </div>
            {active.status !== "COMPLETED" ? (
              <>
                {active.status === "PENDING" && (
                  <button onClick={() => approve(active.id)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-300 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 hover:bg-sky-100">
                    Approve Request
                  </button>
                )}
                <form onSubmit={addStock} className="space-y-3 rounded-xl border border-border p-4">
                  <p className="text-sm font-semibold">Add Stock (received quantity)</p>
                  <p className="text-xs text-muted-foreground">This updates inventory. No real payment — stock simulation only.</p>
                  <label className="block"><span className="mb-1.5 block text-sm font-medium">Received quantity</span>
                    <input required type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} className="input-base" placeholder={active.quantity} /></label>
                  <button type="submit" disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                    <PlusCircle className="h-4 w-4" /> {busy ? "Updating…" : "Add Stock"}
                  </button>
                </form>
              </>
            ) : (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">This request has been completed and stock updated.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}