import API_URL from "@/api/config";

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

// ---------------- Departments ----------------

export async function listDepartments(hospitalId) {
  const data = await apiRequest("/resources/departments");

  return data.map((department) => ({
    id: department.id,
    hospitalId: department.hospital_id,
    name: department.name,
    description: department.description || "",
    createdAt: department.created_at,
  }));
}

export async function createDepartment(
  hospitalId,
  { name, description }
) {
  const data = await apiRequest("/resources/departments", {
    method: "POST",
    body: JSON.stringify({
      name,
      description,
    }),
  });

  return {
    id: data.id,
    hospitalId: data.hospital_id,
    name: data.name,
    description: data.description || "",
    createdAt: data.created_at,
  };
}

export async function updateDepartment(id, patch) {
  const data = await apiRequest(
    `/resources/departments/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(patch),
    }
  );

  return {
    id: data.id,
    hospitalId: data.hospital_id,
    name: data.name,
    description: data.description || "",
    createdAt: data.created_at,
  };
}

export async function deleteDepartment(id) {
  return apiRequest(
    `/resources/departments/${id}`,
    {
      method: "DELETE",
    }
  );
}

// ---------------- Resources ----------------

export async function listResources(
  hospitalId,
  type
) {
  const url = type
    ? `/resources?type=${encodeURIComponent(type)}`
    : "/resources";

  const data = await apiRequest(url);

  return data.map(normalizeResource);
}

export async function searchMedicines(
  hospitalId,
  query
) {
  const data = await apiRequest(
    `/resources/medicines/search?search=${encodeURIComponent(
      query || ""
    )}`
  );

  return data.map(normalizeResource);
}

export async function getResource(id) {
  const data = await apiRequest(
    `/resources/${id}`
  );

  return normalizeResource(data);
}

export async function createResource(
  hospitalId,
  data
) {
  const result = await apiRequest(
    "/resources",
    {
      method: "POST",
      body: JSON.stringify({
        departmentId: data.departmentId || null,
        departmentName:
          data.departmentName || null,
        type: data.type,
        name: data.name,
        quantity: Number(data.quantity) || 0,
        minStock: Number(data.minStock) || 0,
        unit: data.unit || "units",
        status: data.status || "AVAILABLE",
      }),
    }
  );

  return normalizeResource(result);
}

export async function updateResource(
  id,
  patch
) {
  const result = await apiRequest(
    `/resources/${id}`,
    {
      method: "PUT",
      body: JSON.stringify({
        ...patch,
        quantity:
          patch.quantity !== undefined
            ? Number(patch.quantity)
            : undefined,
        minStock:
          patch.minStock !== undefined
            ? Number(patch.minStock)
            : undefined,
      }),
    }
  );

  return normalizeResource(result);
}

export async function deleteResource(id) {
  return apiRequest(
    `/resources/${id}`,
    {
      method: "DELETE",
    }
  );
}

// ---------------- Resource Requests ----------------

export async function listRequests(
  hospitalId
) {
  const data = await apiRequest("/requests");

  return data.map(normalizeRequest);
}

export async function createRequest(
  hospitalId,
  { resourceName, quantity, reason }
) {
  const data = await apiRequest(
    "/requests",
    {
      method: "POST",
      body: JSON.stringify({
        resourceName,
        quantity: Number(quantity),
        reason,
      }),
    }
  );

  return normalizeRequest(data);
}

export async function updateRequestStatus(
  id,
  status
) {
  const data = await apiRequest(
    `/requests/${id}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({
        status,
      }),
    }
  );

  return normalizeRequest(data);
}

export async function fulfillRequest(
  requestId,
  receivedQty
) {
  // The current backend has no separate fulfill endpoint.
  // Mark the request completed through the existing API.
  return updateRequestStatus(
    requestId,
    "COMPLETED"
  );
}

// ---------------- Stock History ----------------

export async function listStockHistory(hospitalId) {
    const data = await apiRequest("/resources/stock-history");

    return data.map((item) => ({
        id: item.id,
        hospitalId: item.hospital_id,
        resourceId: item.resource_id,
        resourceName: item.resource_name,
        change: Number(item.change),
        reason: item.reason,
        date: item.date,
    }));
}

export function recordStockChange(
  hospitalId,
  resourceId,
  resourceName,
  change,
  reason
) {
  // Stock history is already recorded automatically
  // by the backend when a prescription is created.
  return null;
}

// ---------------- Resource Stats ----------------

export async function resourceStats(
  hospitalId
) {
  const resources = await listResources(
    hospitalId
  );

  const requests = await listRequests(
    hospitalId
  );

  const medicines = resources.filter(
    (resource) => resource.type === "medicine"
  );

  const equipment = resources.filter(
    (resource) => resource.type === "equipment"
  );

  const lowStock = medicines.filter(
    (resource) =>
      Number(resource.quantity) <=
      Number(resource.minStock)
  );

  const pendingRequests = requests.filter(
    (request) => request.status === "PENDING"
  );

  return {
    totalMedicines: medicines.length,
    totalEquipment: equipment.length,
    lowStock: lowStock.length,
    pendingRequests: pendingRequests.length,
  };
}

// ---------------- Helpers ----------------

function normalizeResource(resource) {
  return {
    id: resource.id,
    hospitalId: resource.hospital_id,
    departmentId: resource.department_id,
    departmentName: resource.department_name,
    type: resource.type,
    name: resource.name,
    quantity: Number(resource.quantity),
    minStock: Number(resource.min_stock),
    unit: resource.unit,
    status: resource.status,
    lastUpdated: resource.last_updated,
  };
}

function normalizeRequest(request) {
  return {
    id: request.id,
    hospitalId: request.hospital_id,
    resourceName: request.resource_name,
    quantity: Number(request.quantity),
    reason: request.reason,
    status: request.status,
    date: request.date,
  };
}