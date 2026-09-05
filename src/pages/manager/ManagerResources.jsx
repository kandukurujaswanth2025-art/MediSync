import React, { useEffect, useState } from "react";
import { Pill, Boxes, Plus, Pencil, Trash2, Search } from "lucide-react";
import { useAppAuth } from "@/lib/AppAuthContext";
import { useDbVersion } from "@/hooks/useDbVersion";
import { listResources, listDepartments, createResource, updateResource, deleteResource } from "@/services/resourceService";
import { PageHeader, SectionCard, EmptyState, LoadingState } from "@/components/ui-kit";
import StatusBadge from "@/components/StatusBadge";
import ResourceFormModal from "@/components/ResourceFormModal";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function ManagerResources({ type }) {
  const { hospitalId } = useAppAuth();
  const v = useDbVersion();
  const [items, setItems] = useState(null);
  const [depts, setDepts] = useState([]);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const isMed = type === "medicine";
  const Icon = isMed ? Pill : Boxes;
  const title = isMed ? "Medicines" : "Equipment";

  useEffect(() => {
    listResources(hospitalId, type).then(setItems);
    listDepartments(hospitalId).then(setDepts);
  }, [hospitalId, type, v]);

  const filtered = (items || []).filter((r) => !query.trim() || r.name.toLowerCase().includes(query.trim().toLowerCase()));

  const save = async (form) => {
    if (modal.mode === "create") await createResource(hospitalId, { ...form, type });
    else await updateResource(modal.item.id, { ...form, type });
    setModal(null);
  };
  const confirmDelete = async () => { await deleteResource(toDelete.id); setToDelete(null); };

  if (!items) return <LoadingState label={`Loading ${title.toLowerCase()}…`} />;

  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={`Manage ${title.toLowerCase()} for your hospital`} icon={Icon}
        actions={<button onClick={() => setModal({ mode: "create" })} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" /> Add {isMed ? "Medicine" : "Equipment"}</button>} />

      <SectionCard>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${title.toLowerCase()}…`} className="input-base pl-9" />
        </div>
      </SectionCard>

      {filtered.length ? (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Quantity</th>
                  {isMed && <th className="px-4 py-3">Min</th>}
                  <th className="px-4 py-3">Status</th>
                  <th className="hidden px-4 py-3 sm:table-cell">Updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.departmentName}</td>
                    <td className="px-4 py-3">{r.quantity} {r.unit}</td>
                    {isMed && <td className="px-4 py-3 text-muted-foreground">{r.minStock}</td>}
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="hidden px-4 py-3 text-xs text-muted-foreground sm:table-cell">{new Date(r.lastUpdated).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setModal({ mode: "edit", item: r })} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => setToDelete(r)} className="grid h-8 w-8 place-items-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState icon={Icon} title={`No ${title.toLowerCase()} found`} description={`Add your first ${isMed ? "medicine" : "equipment item"}.`} />
      )}

      <ResourceFormModal open={!!modal} onClose={() => setModal(null)} onSubmit={save} initial={modal?.item} departments={depts} type={type} />
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={confirmDelete} title={`Delete ${isMed ? "medicine" : "equipment"}?`} description={`This will permanently remove ${toDelete?.name}.`} confirmLabel="Delete" />
    </div>
  );
}