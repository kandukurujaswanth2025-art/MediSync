import API_URL from "@/api/config";

function getSession() {
  const session = sessionStorage.getItem("medisync_session");

  return session
    ? JSON.parse(session)
    : null;
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

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.message || `Request failed (${response.status})`
    );
  }

  return data;
}

// ============================================================
// QUEUE
// ============================================================

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

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(normalizeQueueEntry);
}

export async function registerVisit(
  hospitalId,
  patient,
  problem
) {
  const data = await apiRequest("/queue", {
    method: "POST",
    body: JSON.stringify({
      hospitalId,
      patientName:
        patient?.fullName || "Walk-in Patient",
      patientId: patient?.id || null,
      problem,
    }),
  });

  return normalizeQueueEntry(data);
}

export async function getMyQueueEntry(
  hospitalId,
  patientId
) {
  const data = await apiRequest("/queue/my");

  if (!data) {
    return null;
  }

  if (
    hospitalId &&
    data.hospital_id !== hospitalId
  ) {
    return null;
  }

  if (
    patientId &&
    data.patient_id !== patientId
  ) {
    return null;
  }

  return normalizeQueueEntry(data);
}

// ============================================================
// QUEUE POSITION
// ============================================================

export function queuePosition(queue, entryId) {
  const ordered = [...queue].sort(prioritySort);

  const index = ordered.findIndex(
    (entry) => entry.id === entryId
  );

  if (index === -1) {
    return {
      position: 0,
      patientsAhead: 0,
      estimatedMinutes: 0,
    };
  }

  const patientsAhead = ordered.filter(
    (entry, currentIndex) =>
      currentIndex < index &&
      (
        entry.status === "WAITING" ||
        entry.status === "CALLED" ||
        entry.status === "IN_CONSULTATION"
      )
  ).length;

  return {
    position: index + 1,
    patientsAhead,
    estimatedMinutes:
      patientsAhead * 10,
  };
}

// ============================================================
// CURRENT PATIENT / CONSULTATION
// ============================================================

export function currentlyServing() {
  return null;
}

export async function getCurrentlyServingFromApi() {
  const data = await apiRequest(
    "/queue/current"
  );

  if (!data) {
    return null;
  }

  return normalizeQueueEntry(data);
}

export async function getCurrentConsultation() {
  const data = await apiRequest(
    "/queue/current"
  );

  if (!data) {
    return null;
  }

  const patient =
    normalizeQueueEntry(data);

  if (
    patient.status !== "CALLED" &&
    patient.status !== "IN_CONSULTATION"
  ) {
    return null;
  }

  return patient;
}

export async function getQueuePosition(entryId) {
  return apiRequest(
    `/queue/${entryId}/position`
  );
}

// ============================================================
// CONSULTATION
// ============================================================

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

// ============================================================
// MEDICINE ORDERS
// ============================================================

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

        items: (items || []).map(
          (item) => ({
            medicineId:
              item.medicineId,

            quantity:
              Number(item.quantity),
          })
        ),
      }),
    }
  );

  return {
    id: data.order.id,

    hospitalId:
      data.order.hospital_id,

    patientId:
      data.order.patient_id,

    patientName:
      data.order.patient_name,

    queueEntryId:
      data.order.queue_entry_id,

    /*
     * Token number is returned by the
     * queue entry when the prescription
     * is fetched later.
     */
    token:
      data.order.token || null,

    status:
      data.order.status,

    createdAt:
      data.order.created_at,

    items:
      (data.items || []).map(
        (item) => ({
          medicineId:
            item.medicineId,

          name:
            item.medicineName,

          quantity:
            Number(item.quantity),
        })
      ),
  };
}

// ============================================================
// PATIENT MEDICINE ORDERS
// ============================================================

export async function listMedicineOrdersForPatient(
  patientId
) {
  const data = await apiRequest(
    "/medicines/prescriptions/my"
  );

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(
    (order) => ({
      id: order.id,

      hospitalId:
        order.hospital_id,

      patientId:
        order.patient_id,

      patientName:
        order.patient_name,

      queueEntryId:
        order.queue_entry_id,

      // NEW: patient's queue token
      token:
        order.token || null,

      status:
        order.status,

      /*
       * Backend now explicitly returns
       * the timestamp as UTC.
       *
       * JavaScript's Date object will
       * convert it to the user's local
       * timezone when displayed.
       */
      createdAt:
        order.created_at,

      items:
        (order.items || []).map(
          (item) => ({
            medicineId:
              item.medicineId,

            name:
              item.medicineName,

            quantity:
              Number(item.quantity),
          })
        ),
    })
  );
}

// ============================================================
// GET SINGLE MEDICINE ORDER
// ============================================================

export async function getMedicineOrder(
  id
) {
  const data = await apiRequest(
    `/medicines/prescriptions/${id}`
  );

  return {
    id: data.id,

    hospitalId:
      data.hospitalId,

    patientId:
      data.patientId,

    patientName:
      data.patientName,

    queueEntryId:
      data.queueEntryId,

    // NEW: token
    token:
      data.token || null,

    status:
      data.status,

    createdAt:
      data.createdAt,

    items:
      (data.items || []).map(
        (item) => ({
          medicineId:
            item.medicineId,

          name:
            item.medicineName,

          quantity:
            Number(item.quantity),
        })
      ),
  };
}

// ============================================================
// DELETE MEDICINE ORDER
// ============================================================

export async function deleteMedicineOrder(
  orderId
) {
  if (!orderId) {
    throw new Error(
      "Medicine order ID is required"
    );
  }

  const data =
    await apiRequest(
      `/medicines/prescriptions/${orderId}`,
      {
        method: "DELETE",
      }
    );

  return data;
}

// ============================================================
// HOSPITAL STATISTICS
// ============================================================

export async function hospitalStats(
  hospitalId
) {
  const [
    queueStats,
    resources
  ] = await Promise.all([
    apiRequest("/queue/stats"),
    apiRequest("/resources"),
  ]);

  const resourceList =
    Array.isArray(resources)
      ? resources
      : [];

  const medicines =
    resourceList.filter(
      (resource) =>
        resource.type === "medicine"
    );

  return {
    waiting:
      Number(
        queueStats?.waiting || 0
      ),

    emergencyWaiting: 0,

    current: null,

    completed:
      Number(
        queueStats?.completed || 0
      ),

    availableMedicines:
      medicines.filter(
        (medicine) =>
          medicine.status ===
          "AVAILABLE"
      ).length,

    lowStock:
      medicines.filter(
        (medicine) =>
          Number(
            medicine.quantity
          ) <=
          Number(
            medicine.min_stock
          )
      ).length,
  };
}

// ============================================================
// HELPERS
// ============================================================

function prioritySort(a, b) {
  const aEmergency =
    a.priority === "EMERGENCY"
      ? 0
      : 1;

  const bEmergency =
    b.priority === "EMERGENCY"
      ? 0
      : 1;

  if (
    aEmergency !==
    bEmergency
  ) {
    return (
      aEmergency -
      bEmergency
    );
  }

  return (
    new Date(
      a.registeredAt ||
      a.registered_at
    ) -
    new Date(
      b.registeredAt ||
      b.registered_at
    )
  );
}

function normalizeQueueEntry(
  data
) {
  if (!data) {
    return null;
  }

  return {
    id: data.id,

    hospitalId:
      data.hospital_id,

    patientId:
      data.patient_id,

    patientName:
      data.patient_name,

    problem:
      data.problem,

    priority:
      data.priority,

    token:
      data.token,

    registeredAt:
      data.registered_at,

    status:
      data.status,

    medicineOrderId:
      data.medicine_order_id,
  };
}