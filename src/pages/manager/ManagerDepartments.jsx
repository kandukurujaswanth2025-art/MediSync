import React, { useEffect, useState } from "react";
import { Building2, Plus, Pencil, Trash2 } from "lucide-react";
import { useAppAuth } from "@/lib/AppAuthContext";
import { useDbVersion } from "@/hooks/useDbVersion";
import { listDepartments, createDepartment, updateDepartment, deleteDepartment } from "@/services/resourceService";
import { PageHeader, SectionCard, EmptyState, LoadingState } from "@/components/ui-kit";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function ManagerDepartments() {
  const { hospitalId } = useAppAuth();
  const v = useDbVersion();
  const [depts, setDepts] = useState(null);
  const [modal, setModal] = useState(null); // {mode, item}
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  useEffect(() => { listDepartments(hospitalId).then(setDepts); }, [hospitalId, v]);

  const openCreate = () => { setName(""); setDescription(""); setModal({ mode: "create" }); };
  const openEdit = (d) => { setName(d.name); setDescription(d.description); setModal({ mode: "edit", item: d }); };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (modal.mode === "create") await createDepartment(hospitalId, { name, description });
      else await updateDepartment(modal.item.id, { name, description });
      setModal(null);
    } finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    await deleteDepartment(toDelete.id);
    setToDelete(null);
  };

  if (!depts) return <LoadingState label="Loading departments…" />;

  return (
    <div className="space-y-6">
      <PageHeader title="Departments" subtitle="Organize resources by department" icon={Building2}
        actions={<button onClick={openCreate} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" /> Add Department</button>} />

      {depts.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {depts.map((d) => (
            <div key={d.id} className="card-soft p-5">
              <div className="flex items-start justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></span>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(d)} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => setToDelete(d)} className="grid h-8 w-8 place-items-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <h3 className="mt-3 font-semibold">{d.name}</h3>
              <p className="text-sm text-muted-foreground">{d.description || "No description"}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Building2} title="No departments" description="Add your first department." action={<button onClick={openCreate} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Add Department</button>} />
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === "edit" ? "Edit department" : "Add department"}>
        <form onSubmit={save} className="space-y-3">
          <label className="block"><span className="mb-1.5 block text-sm font-medium">Name</span>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="input-base" placeholder="e.g. Orthopedics" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-medium">Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input-base" /></label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModal(null)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
            <button type="submit" disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{busy ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={confirmDelete} title="Delete department?" description={`This will permanently remove ${toDelete?.name}.`} confirmLabel="Delete" />
    </div>
  );
}