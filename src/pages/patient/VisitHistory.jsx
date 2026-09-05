import React, { useEffect, useState } from "react";
import { History } from "lucide-react";
import { useAppAuth } from "@/lib/AppAuthContext";
import { useDbVersion } from "@/hooks/useDbVersion";
import { listMedicineOrdersForPatient } from "@/services/queueService";
import {
  PageHeader,
  SectionCard,
  EmptyState,
  LoadingState
} from "@/components/ui-kit";
import StatusBadge from "@/components/StatusBadge";

const API_URL = "http://localhost:5000/api";

export default function VisitHistory() {
  const { session, selectedHospitalId } = useAppAuth();
  const v = useDbVersion();

  const [visits, setVisits] = useState(null);
  const [orders, setOrders] = useState([]);
  const [hospital, setHospital] = useState(null);

  const getToken = () => {
    const saved = localStorage.getItem("medisync_session");
    const data = saved ? JSON.parse(saved) : null;
    return data?.token;
  };

  const loadHospital = async () => {
    if (!selectedHospitalId) return;

    try {
      const token = getToken();

      const response = await fetch(
        `${API_URL}/hospitals/${selectedHospitalId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch hospital");
      }

      const data = await response.json();
      setHospital(data);
    } catch (error) {
      console.error("Failed to load hospital:", error);
    }
  };

  const loadHistory = async () => {
    if (!session?.patientId) return;

    try {
      const token = getToken();

      const response = await fetch(
        `${API_URL}/queue/history`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch visit history");
      }

      const data = await response.json();

      const normalizedVisits = data.map((entry) => ({
        id: entry.id,
        hospitalId: entry.hospital_id,
        patientId: entry.patient_id,
        patientName: entry.patient_name,
        problem: entry.problem,
        token: entry.token,
        registeredAt: entry.registered_at,
        status: entry.status,
        medicineOrderId: entry.medicine_order_id,
        priority: entry.priority
      }));

      setVisits(normalizedVisits);

      const medicineOrders =
        await listMedicineOrdersForPatient(
          session.patientId
        );

      setOrders(medicineOrders || []);
    } catch (error) {
      console.error("Failed to load visit history:", error);
      setVisits([]);
      setOrders([]);
    }
  };

  useEffect(() => {
    loadHospital();
    loadHistory();
  }, [selectedHospitalId, session?.patientId, v]);

  if (!visits) {
    return <LoadingState label="Loading history…" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visit History"
        subtitle={hospital ? hospital.name : ""}
        icon={History}
      />

      {visits.length ? (
        <div className="space-y-3">
          {visits.map((visit) => {
            const order = orders.find(
              (o) => o.queueEntryId === visit.id
            );

            return (
              <SectionCard key={visit.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-lg font-bold text-primary">
                      {visit.token}
                    </span>

                    <div>
                      <p className="font-medium">
                        {visit.problem}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {new Date(
                          visit.registeredAt
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {order && (
                      <span className="text-xs text-muted-foreground">
                        {order.items.length} medicine(s)
                      </span>
                    )}

                    <StatusBadge status={visit.status} />
                  </div>
                </div>

                {order && (
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Medicines
                    </p>

                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {order.items.map((item, i) => (
                        <span
                          key={i}
                          className="rounded-lg bg-muted px-2.5 py-1 text-xs font-medium"
                        >
                          {item.name} × {item.quantity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </SectionCard>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={History}
          title="No visits yet"
          description="Your consultation history will appear here."
        />
      )}
    </div>
  );
}