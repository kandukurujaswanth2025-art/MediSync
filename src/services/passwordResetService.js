import API_URL from "@/api/config";

async function apiRequest(url, options = {}) {
    const response = await fetch(`${API_URL}${url}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
        },
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Request failed");
    }

    return data;
}

export async function sendOtp(role, email, hospitalCode) {
    const data = await apiRequest(
        "/auth/password-reset/request",
        {
            method: "POST",
            body: JSON.stringify({
                role,
                email,
                hospitalCode,
            }),
        }
    );

    return data;
}

export async function verifyOtp(
    role,
    email,
    hospitalCode,
    otp
) {
    const data = await apiRequest(
        "/auth/password-reset/verify",
        {
            method: "POST",
            body: JSON.stringify({
                role,
                email,
                hospitalCode,
                otp,
            }),
        }
    );

    if (!data.verified) {
        throw new Error(
            data.message || "OTP verification failed."
        );
    }

    return data;
}

export async function resetPassword(
    role,
    email,
    hospitalCode,
    otp,
    newPassword
) {
    const data = await apiRequest(
        "/auth/password-reset/reset",
        {
            method: "POST",
            body: JSON.stringify({
                role,
                email,
                hospitalCode,
                otp,
                newPassword,
            }),
        }
    );

    return data;
}