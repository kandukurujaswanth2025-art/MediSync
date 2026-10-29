import API_URL from "@/api/config";

function saveSession(session) {
    sessionStorage.setItem(
        "medisync_session",
        JSON.stringify(session)
    );

    return session;
}

function getSession() {
    const session =
        sessionStorage.getItem(
            "medisync_session"
        );

    return session
        ? JSON.parse(session)
        : null;
}


async function apiRequest(
    url,
    options = {}
) {
    const response = await fetch(
        `${API_URL}${url}`,
        {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message || "Request failed"
        );
    }

    return data;
}


// --------------------------------------------------
// HOSPITAL LOGIN
// --------------------------------------------------

export async function loginHospital(
    email,
    password
) {
    const data = await apiRequest(
        "/auth/hospital/login",
        {
            method: "POST",
            body: JSON.stringify({
                email,
                password
            })
        }
    );

    const session = {
        role: "hospital",
        hospitalId:
            data.user.hospitalId,
        hospitalCode:
            data.user.hospitalId,
        name: data.user.name,
        email: data.user.email,
        userId: data.user.id,
        token: data.token
    };

    saveSession(session);

    return session;
}

// --------------------------------------------------
// RESOURCE MANAGER LOGIN
// --------------------------------------------------


 // --------------------------------------------------
// RESOURCE MANAGER LOGIN + MFA
// --------------------------------------------------

export async function loginResourceManager(
    hospitalCode,
    password
) {
    const data = await apiRequest(
        "/auth/manager/login",
        {
            method: "POST",
            body: JSON.stringify({
                hospitalCode,
                password
            })
        }
    );

    // If MFA is enabled, do NOT save a session yet.
    if (data.mfaRequired) {
        return {
            mfaRequired: true,
            challengeToken: data.challengeToken,
            message: data.message
        };
    }

    // Normal login when MFA is not enabled.
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

// --------------------------------------------------
// VERIFY RESOURCE MANAGER MFA
// --------------------------------------------------

export async function verifyManagerMfa(
    challengeToken,
    code,
    hospitalCode
) {
    const data = await apiRequest(
        "/auth/manager/verify-mfa",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${challengeToken}`
            },
            body: JSON.stringify({
                challengeToken,
                code
            })
        }
    );

    // Save a full session only after successful verification.
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


// --------------------------------------------------
// PATIENT LOGIN
// --------------------------------------------------

export async function loginPatient(
    email,
    password
) {
    const data = await apiRequest(
        "/auth/patient/login",
        {
            method: "POST",
            body: JSON.stringify({
                email,
                password
            })
        }
    );

    const session = {
        role: "patient",
        patientId:
            data.user.id,
        userId:
            data.user.id,
        name:
            data.user.name,
        email:
            data.user.email,
        phone:
            data.user.phone,
        age:
            data.user.age,
        gender:
            data.user.gender,
        selectedHospitalId: null,
        token:
            data.token
    };

    saveSession(session);

    return session;
}

// --------------------------------------------------
// PATIENT REGISTRATION
// --------------------------------------------------

export async function registerPatient({
    fullName,
    email,
    phone,
    password,
    age,
    gender
}) {
    const data =
        await apiRequest(
            "/auth/patient/register",
            {
                method: "POST",
                body: JSON.stringify({
                    fullName,
                    email,
                    phone,
                    password,
                    age,
                    gender
                })
            }
        );

    const session = {
        role: "patient",
        patientId:
            data.user.id,
        userId:
            data.user.id,
        name:
            data.user.name,
        email:
            data.user.email,
        phone:
            data.user.phone,
        age:
            data.user.age,
        gender:
            data.user.gender,
        selectedHospitalId: null,
        token:
            data.token
    };

    saveSession(session);

    return session;
}

// --------------------------------------------------
// CURRENT SESSION
// --------------------------------------------------

export function currentSession() {
    return getSession();
}

// --------------------------------------------------
// UPDATE SESSION
// --------------------------------------------------

export function updateSession(
    patch
) {
    const session =
        getSession();

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

// --------------------------------------------------
// LOGOUT
// --------------------------------------------------

export async function logout() {
    sessionStorage.removeItem(
        "medisync_session"
    );
}