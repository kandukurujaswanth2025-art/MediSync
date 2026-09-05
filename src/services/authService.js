import API_URL from "@/api/config";

function saveSession(session) {
    localStorage.setItem("medisync_session", JSON.stringify(session));
    return session;
}

function getSession() {
    const session = localStorage.getItem("medisync_session");
    return session ? JSON.parse(session) : null;
}

async function apiRequest(url, options = {}) {
    const response = await fetch(`${API_URL}${url}`, {
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        },
        ...options
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Request failed");
    }

    return data;
}

export async function loginHospital(email, password) {
    const data = await apiRequest("/auth/hospital/login", {
        method: "POST",
        body: JSON.stringify({
            email,
            password
        })
    });

    const session = {
        role: "hospital",
        hospitalId: data.user.hospitalId,
        hospitalCode: data.user.hospitalId,
        name: data.user.name,
        email: data.user.email,
        userId: data.user.id,
        token: data.token
    };

    saveSession(session);

    return session;
}

export async function loginResourceManager(hospitalCode, password) {
    const data = await apiRequest("/auth/manager/login", {
        method: "POST",
        body: JSON.stringify({
            hospitalCode,
            password
        })
    });

    const session = {
        role: "manager",
        hospitalId: data.user.hospitalId,
        hospitalCode,
        name: data.user.name,
        email: data.user.email,
        userId: data.user.id,
        token: data.token
    };

    saveSession(session);

    return session;
}

export async function loginPatient(email, password) {
    const data = await apiRequest("/auth/patient/login", {
        method: "POST",
        body: JSON.stringify({
            email,
            password
        })
    });

    const session = {
        role: "patient",
        patientId: data.user.id,
        userId: data.user.id,
        name: data.user.name,
        email: data.user.email,
        phone: data.user.phone,
        age: data.user.age,
        gender: data.user.gender,
        selectedHospitalId: null,
        token: data.token
    };

    saveSession(session);

    return session;
}

export async function registerPatient({
    fullName,
    email,
    phone,
    password,
    age,
    gender
}) {
    const data = await apiRequest("/auth/patient/register", {
        method: "POST",
        body: JSON.stringify({
            fullName,
            email,
            phone,
            password,
            age,
            gender
        })
    });

    const session = {
        role: "patient",
        patientId: data.user.id,
        userId: data.user.id,
        name: data.user.name,
        email: data.user.email,
        phone: data.user.phone,
        age: data.user.age,
        gender: data.user.gender,
        selectedHospitalId: null,
        token: data.token
    };

    saveSession(session);

    return session;
}

export function currentSession() {
    return getSession();
}

export function updateSession(patch) {
    const session = getSession();

    if (!session) {
        return null;
    }

    const next = {
        ...session,
        ...patch
    };

    saveSession(next);

    return next;
}

export async function logout() {
    localStorage.removeItem("medisync_session");
}