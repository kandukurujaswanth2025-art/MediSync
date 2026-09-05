import React, { useEffect, useState } from "react";
import { PackageOpen, Send } from "lucide-react";
import { useAppAuth } from "@/lib/AppAuthContext";
import { useDbVersion } from "@/hooks/useDbVersion";
import { listRequests, createRequest } from "@/services/resourceService";
import { PageHeader, SectionCard, EmptyState, LoadingState } from "@/components/ui-kit";
import StatusBadge from "@/components/StatusBadge";

export default function HospitalRequests() {
  const { hospitalId } = useAppAuth();
  const v = useDbVersion();
  const [requests, setRequests] = useState(null);
  const [form, setForm] = useState({ resourceName: "", quantity: "", reason: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => { listRequests(hospitalId).then(setRequests); }, [hospitalId, v]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setSent(false);
    try {
      await createRequest(hospitalId, form);
      setForm({ resourceName: "", quantity: "", reason: "" });
      setSent(true);
    } finally { setBusy(false); }
  };

  if (!requests) return <LoadingState label="Loading requests…" />;

  return (
    <div className="space-y-6">
      <PageHeader title="Resource Requests" subtitle="Request stock from your resource manager" icon={PackageOpen} />

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Request a Resource" subtitle="The manager will receive this request" className="lg:col-span-1">
          <form onSubmit={submit} className="space-y-3">
            <label className="block"><span className="mb-1.5 block text-sm font-medium">Resource name</span>
              <input required value={form.resourceName} onChange={set("resourceName")} className="input-base" placeholder="e.g. ECG Machine" /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-medium">Quantity</span>
              <input required type="number" min="1" value={form.quantity} onChange={set("quantity")} className="input-base" placeholder="2" /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-medium">Reason</span>
              <textarea required value={form.reason} onChange={set("reason")} rows={3} className="input-base" placeholder="Why is this needed?" /></label>
            <button type="submit" disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              <Send className="h-4 w-4" /> {busy ? "Sending…" : "Send Request"}
            </button>
            {sent && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Request sent to the resource manager.</p>}
          </form>
        </SectionCard>

        <SectionCard title="Requests Sent" subtitle={`${requests.length} request(s)`} className="lg:col-span-2">
          {requests.length ? (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr><th className="px-4 py-3">Resource</th><th className="px-4 py-3">Qty</th><th className="hidden px-4 py-3 sm:table-cell">Reason</th><th className="px-4 py-3">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {requests.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{r.resourceName}</td>
                      <td className="px-4 py-3">{r.quantity}</td>
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{r.reason}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={PackageOpen} title="No requests yet" description="Request a resource using the form." />
          )}
        </SectionCard>
      </div>
    </div>
  );
}