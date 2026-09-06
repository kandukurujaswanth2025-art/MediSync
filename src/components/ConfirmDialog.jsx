import React, { useState } from "react";
import Modal from "@/components/Modal";

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Yes",
  tone = "danger",
  loading
}) {
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    setBusy(true);

    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  const toneCls =
    tone === "danger"
      ? "bg-rose-600 hover:bg-rose-700 text-white"
      : "bg-primary hover:bg-primary/90 text-primary-foreground";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
    >
      <div className="mt-5 flex justify-end gap-3">
        {/* NO BUTTON */}
        <button
          type="button"
          onClick={onClose}
          disabled={busy || loading}
          className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          No
        </button>

        {/* YES BUTTON */}
        <button
          type="button"
          onClick={handle}
          disabled={busy || loading}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${toneCls}`}
        >
          {busy || loading ? "Working…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}