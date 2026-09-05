const API_URL = "http://localhost:5000/api";

function getSession() {
  const session = localStorage.getItem("medisync_session");
  return session ? JSON.parse(session) : null;
}

function getToken() {
  const session = getSession();

  if (!session?.token) {
    throw new Error("Authentication required. Please login again.");
  }

  return session.token;
}

async function apiRequest(url, options = {}) {
  const token = getToken();

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

// ---------------- Queue ----------------

export async function listQueue(hospitalId) {
    const session = getSession();

    if (session?.role === "patient") {
        const entry = await getMyQueueEntry(
            hospitalId,
            session.patientId
        );

        return entry ? [entry] : [];
    }

    const data = await apiRequest("/queue");

    return data.map(normalizeQueueEntry);
}

export async function registerVisit(hospitalId, patient, problem) {
  const data = await apiRequest("/queue", {
    method: "POST",
    body: JSON.stringify({
      hospitalId,
      patientName: patient?.fullName || "Walk-in Patient",
      patientId: patient?.id || null,
      problem,
    }),
  });

  return {
    id: data.id,
    hospitalId: data.hospital_id,
    patientId: data.patient_id,
    patientName: data.patient_name,
    problem: data.problem,
    priority: data.priority,
    token: data.token,
    registeredAt: data.registered_at,
    status: data.status,
    medicineOrderId: data.medicine_order_id,
  };
}

export async function getMyQueueEntry(hospitalId, patientId) {
  const data = await apiRequest("/queue/my");

  if (!data) {
    return null;
  }

  if (hospitalId && data.hospital_id !== hospitalId) {
    return null;
  }

  if (patientId && data.patient_id !== patientId) {
    return null;
  }

  return {
    id: data.id,
    hospitalId: data.hospital_id,
    patientId: data.patient_id,
    patientName: data.patient_name,
    problem: data.problem,
    priority: data.priority,
    token: data.token,
    registeredAt: data.registered_at,
    status: data.status,
    medicineOrderId: data.medicine_order_id,
  };
}

// Keeps the existing UI signature.
// Queue returned to the patient contains the current active visit,
// so position is obtained from the backend below when needed.
export function queuePosition(queue, entryId) {
  const ordered = [...queue].sort(prioritySort);

  const idx = ordered.findIndex(
    (q) => q.id === entryId
  );

  if (idx === -1) {
    return {
      position: 0,
      patientsAhead: 0,
      estimatedMinutes: 0,
    };
  }

  const ahead = ordered.filter(
    (q, i) =>
      i < idx &&
      (
        q.status === "WAITING" ||
        q.status === "CALLED" ||
        q.status === "IN_CONSULTATION"
      )
  ).length;

  return {
    position: idx + 1,
    patientsAhead: ahead,
    estimatedMinutes: ahead * 10,
  };
}

export function currentlyServing(hospitalId) {
  // This function is kept synchronous for the existing UI.
  // Hospital-side pages should use getCurrentlyServingFromApi().
  return null;
}

export async function getCurrentlyServingFromApi() {
  const data = await apiRequest("/queue/current");

  if (!data) {
    return null;
  }

  return normalizeQueueEntry(data);
}

export async function getQueuePosition(entryId) {
  return apiRequest(`/queue/${entryId}/position`);
}

// ---------------- Consultation ----------------

export async function callPatient(entryId) {
  const data = await apiRequest(
    `/queue/${entryId}/call`,
    {
      method: "PATCH",
    }
  );

  return normalizeQueueEntry(data);
}

export async function startConsultation(entryId) {
  const data = await apiRequest(
    `/queue/${entryId}/start`,
    {
      method: "PATCH",
    }
  );

  return normalizeQueueEntry(data);
}

export async function completeConsultation(entryId) {
  const data = await apiRequest(
    `/queue/${entryId}/complete`,
    {
      method: "PATCH",
    }
  );

  return normalizeQueueEntry(data);
}

// ---------------- Medicine Orders ----------------

export async function createMedicineOrder(
  hospitalId,
  entry,
  items
) {
  const data = await apiRequest(
    "/medicines/prescriptions",
    {
      method: "POST",
      body: JSON.stringify({
        queueEntryId: entry.id,
        patientId: entry.patientId,
        patientName: entry.patientName,
        items: items.map((item) => ({
          medicineId: item.medicineId,
          quantity: Number(item.quantity),
        })),
      }),
    }
  );

  return {
    id: data.order.id,
    hospitalId: data.order.hospital_id,
    patientId: data.order.patient_id,
    patientName: data.order.patient_name,
    queueEntryId: data.order.queue_entry_id,
    status: data.order.status,
    createdAt: data.order.created_at,
    items: data.items.map((item) => ({
      medicineId: item.medicineId,
      name: item.medicineName,
      quantity: Number(item.quantity),
    })),
  };
}

export async function listMedicineOrdersForPatient(
  patientId
) {
  const data = await apiRequest(
    "/medicines/prescriptions/my"
  );

  return data.map((order) => ({
    id: order.id,
    hospitalId: order.hospital_id,
    patientId: order.patient_id,
    patientName: order.patient_name,
    queueEntryId: order.queue_entry_id,
    status: order.status,
    createdAt: order.created_at,
    items: (order.items || []).map((item) => ({
      medicineId: item.medicineId,
      name: item.medicineName,
      quantity: Number(item.quantity),
    })),
  }));
}

export async function getMedicineOrder(id) {
  const data = await apiRequest(
    `/medicines/prescriptions/${id}`
  );

  return {
    id: data.id,
    hospitalId: data.hospitalId,
    patientId: data.patientId,
    patientName: data.patientName,
    queueEntryId: data.queueEntryId,
    status: data.status,
    createdAt: data.createdAt,
    items: data.items.map((item) => ({
      medicineId: item.medicineId,
      name: item.medicineName,
      quantity: Number(item.quantity),
    })),
  };
}

// ---------------- Hospital Stats ----------------

export async function hospitalStats(hospitalId) {
  const [queueStats, resources] = await Promise.all([
    apiRequest("/queue/stats"),
    apiRequest("/resources"),
  ]);

  const medicines = resources.filter(
    (resource) => resource.type === "medicine"
  );

  return {
    waiting: Number(queueStats.waiting || 0),

    emergencyWaiting: 0,

    current: null,

    completed: Number(queueStats.completed || 0),

    availableMedicines: medicines.filter(
      (medicine) => medicine.status === "AVAILABLE"
    ).length,

    lowStock: medicines.filter(
      (medicine) =>
        Number(medicine.quantity) <=
        Number(medicine.min_stock)
    ).length,
  };
}

// ---------------- Helpers ----------------

function prioritySort(a, b) {
  const aE = a.priority === "EMERGENCY" ? 0 : 1;
  const bE = b.priority === "EMERGENCY" ? 0 : 1;

  if (aE !== bE) {
    return aE - bE;
  }

  return (
    new Date(a.registeredAt || a.registered_at) -
    new Date(b.registeredAt || b.registered_at)
  );
}

function normalizeQueueEntry(data) {
  return {
    id: data.id,
    hospitalId: data.hospital_id,
    patientId: data.patient_id,
    patientName: data.patient_name,
    problem: data.problem,
    priority: data.priority,
    token: data.token,
    registeredAt: data.registered_at,
    status: data.status,
    medicineOrderId: data.medicine_order_id,
  };
}