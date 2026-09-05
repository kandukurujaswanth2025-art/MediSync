import React, { useEffect, useState } from "react";
import Modal from "@/components/Modal";

// Shared form for creating/editing a medicine or equipment resource.
export default function ResourceFormModal({ open, onClose, onSubmit, initial, departments, type }) {
  const [form, setForm] = useState(emptyForm(type));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm(initial ? { ...emptyForm(type), ...initial } : emptyForm(type));
  }, [initial, type, open]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await onSubmit(form); } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit resource" : "Add resource"} size="md">
      <form onSubmit={submit} className="space-y-3">
        <label className="block"><span className="mb-1.5 block text-sm font-medium">Name</span>
          <input required value={form.name} onChange={set("name")} className="input-base" placeholder="e.g. Paracetamol 500mg" /></label>
        <label className="block"><span className="mb-1.5 block text-sm font-medium">Department</span>
          <select required value={form.departmentId} onChange={set("departmentId")} className="input-base">
            <option value="">Select department</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="mb-1.5 block text-sm font-medium">Quantity</span>
            <input required type="number" min="0" value={form.quantity} onChange={set("quantity")} className="input-base" /></label>
          {type === "medicine" ? (
            <label className="block"><span className="mb-1.5 block text-sm font-medium">Minimum stock</span>
              <input required type="number" min="0" value={form.minStock} onChange={set("minStock")} className="input-base" /></label>
          ) : (
            <label className="block"><span className="mb-1.5 block text-sm font-medium">Status</span>
              <select value={form.status} onChange={set("status")} className="input-base">
                <option value="AVAILABLE">Available</option>
                <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                <option value="OUT_OF_SERVICE">Out of Service</option>
              </select></label>
          )}
        </div>
        {type === "medicine" && (
          <label className="block"><span className="mb-1.5 block text-sm font-medium">Unit</span>
            <input value={form.unit} onChange={set("unit")} className="input-base" placeholder="tablets / vials / inhalers" /></label>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
          <button type="submit" disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{busy ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </Modal>
  );
}

function emptyForm(type) {
  return { name: "", departmentId: "", quantity: 0, minStock: 0, unit: "units", status: "AVAILABLE", type };
}