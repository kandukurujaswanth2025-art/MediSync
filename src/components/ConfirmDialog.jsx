import React, { useState } from "react";
import Modal from "@/components/Modal";

export default function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = "Confirm", tone = "danger", loading }) {
  const [busy, setBusy] = useState(false);
  const handle = async () => {
    setBusy(true);
    try { await onConfirm(); } finally { setBusy(false); }
  };
  const toneCls = tone === "danger" ? "bg-rose-600 hover:bg-rose-700 text-white" : "bg-primary hover:bg-primary/90 text-primary-foreground";
  return (
    <Modal open={open} onClose={onClose} title={title} description={description} size="sm">
      <div className="mt-2 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">Cancel</button>
        <button onClick={handle} disabled={busy || loading} className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60 ${toneCls}`}>
          {busy || loading ? "Working…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}