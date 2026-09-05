const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

function generateToken(user) {
    return jwt.sign(
        {
            userId: user.id,
            role: user.role,
            hospitalId: user.hospital_id
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );
}

async function hospitalLogin(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const result = await pool.query(
            `SELECT *
             FROM users
             WHERE email = $1
             AND role = 'HOSPITAL'`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const user = result.rows[0];

        const validPassword = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!validPassword) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = generateToken(user);

        res.json({
            message: "Hospital login successful",
            token,
            user: {
                id: user.id,
                hospitalId: user.hospital_id,
                name: user.full_name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Hospital login error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
}

async function managerLogin(req, res) {
    try {
        const { hospitalCode, password } = req.body;

        if (!hospitalCode || !password) {
            return res.status(400).json({
                message: "Hospital code and password are required"
            });
        }

        const hospitalResult = await pool.query(
            `SELECT id
             FROM hospitals
             WHERE code = $1`,
            [hospitalCode.toUpperCase()]
        );

        if (hospitalResult.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid hospital code or password"
            });
        }

        const hospitalId = hospitalResult.rows[0].id;

        const result = await pool.query(
            `SELECT *
             FROM users
             WHERE hospital_id = $1
             AND role = 'RESOURCE_MANAGER'`,
            [hospitalId]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid hospital code or password"
            });
        }

        const user = result.rows[0];

        const validPassword = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!validPassword) {
            return res.status(401).json({
                message: "Invalid hospital code or password"
            });
        }

        const token = generateToken(user);

        res.json({
            message: "Resource manager login successful",
            token,
            user: {
                id: user.id,
                hospitalId: user.hospital_id,
                name: user.full_name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Manager login error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
}

async function patientLogin(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const result = await pool.query(
            `SELECT *
             FROM users
             WHERE email = $1
             AND role = 'PATIENT'`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const user = result.rows[0];

        const validPassword = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!validPassword) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = generateToken(user);

        res.json({
            message: "Patient login successful",
            token,
            user: {
                id: user.id,
                hospitalId: user.hospital_id,
                name: user.full_name,
                email: user.email,
                phone: user.phone,
                age: user.age,
                gender: user.gender,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Patient login error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
}

async function patientRegister(req, res) {
    try {
        const {
            fullName,
            email,
            phone,
            password,
            age,
            gender,
            recoveryEmail
        } = req.body;

        if (!fullName || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required"
            });
        }

        const existingUser = await pool.query(
            `SELECT id
             FROM users
             WHERE email = $1`,
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "An account with this email already exists"
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const id = `PAT${Date.now()}`;

        const result = await pool.query(
            `INSERT INTO users
            (
                id,
                hospital_id,
                full_name,
                email,
                phone,
                password_hash,
                role,
                age,
                gender,
                recovery_email
            )
            VALUES
            ($1, NULL, $2, $3, $4, $5, 'PATIENT', $6, $7, $8)
            RETURNING *`,
            [
                id,
                fullName,
                email,
                phone || null,
                passwordHash,
                age || null,
                gender || null,
                recoveryEmail || email
            ]
        );

        const user = result.rows[0];

        const token = generateToken(user);

        res.status(201).json({
            message: "Patient registration successful",
            token,
            user: {
                id: user.id,
                name: user.full_name,
                email: user.email,
                phone: user.phone,
                age: user.age,
                gender: user.gender,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Patient registration error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
}

function generateOtp() {
    return crypto.randomInt(100000, 1000000).toString();
}

function hashOtp(otp) {
    return crypto
        .createHash("sha256")
        .update(otp)
        .digest("hex");
}

async function sendResetOtp(req, res) {
    try {
        const { role, email, hospitalCode } = req.body;

        let userResult;

        if (role === "manager") {
            userResult = await pool.query(
                `SELECT u.*, h.code, h.recovery_email AS hospital_recovery_email
                 FROM users u
                 JOIN hospitals h ON u.hospital_id = h.id
                 WHERE h.code = $1
                 AND u.role = 'RESOURCE_MANAGER'`,
                [String(hospitalCode || "").toUpperCase()]
            );
        } else if (role === "hospital") {
            userResult = await pool.query(
                `SELECT u.*, h.recovery_email AS hospital_recovery_email
                 FROM users u
                 LEFT JOIN hospitals h ON u.hospital_id = h.id
                 WHERE u.email = $1
                 AND u.role = 'HOSPITAL'`,
                [email]
            );
        } else if (role === "patient") {
            userResult = await pool.query(
                `SELECT *
                 FROM users
                 WHERE email = $1
                 AND role = 'PATIENT'`,
                [email]
            );
        } else {
            return res.status(400).json({
                message: "Invalid account role"
            });
        }

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                message: "No account found with these details."
            });
        }

        const user = userResult.rows[0];

        const recoveryEmail =
            user.recovery_email ||
            user.hospital_recovery_email ||
            user.email;

        if (!recoveryEmail) {
            return res.status(400).json({
                message: "No recovery email is configured for this account."
            });
        }

        const otp = generateOtp();
        const otpHash = hashOtp(otp);

        await pool.query(
            `UPDATE password_reset_otps
             SET verified = true
             WHERE user_id = $1
             AND verified = false`,
            [user.id]
        );

        await pool.query(
            `INSERT INTO password_reset_otps
             (user_id, otp_hash, expires_at, attempts, verified, created_at)
             VALUES ($1, $2, NOW() + INTERVAL '10 minutes', 0, false, NOW())`,
            [user.id, otpHash]
        );

        const brevoResponse = await fetch(
            "https://api.brevo.com/v3/smtp/email",
            {
                method: "POST",
                headers: {
                    accept: "application/json",
                    "api-key": process.env.BREVO_API_KEY,
                    "content-type": "application/json"
                },
                body: JSON.stringify({
                    sender: {
                        name: process.env.EMAIL_FROM_NAME || "MediSync",
                        email: process.env.EMAIL_FROM
                    },
                    to: [
                        {
                            email: recoveryEmail
                        }
                    ],
                    subject: "MediSync Password Reset OTP",
                    htmlContent: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 12px;">
                            <h2 style="color: #1e3a8a;">MediSync Password Reset</h2>

                            <p>Hello,</p>

                            <p>We received a request to reset your MediSync password.</p>

                            <p>Your OTP is:</p>

                            <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e3a8a; padding: 15px 0;">
                                ${otp}
                            </div>

                            <p>This OTP will expire in <strong>10 minutes</strong>.</p>

                            <p>If you did not request a password reset, please ignore this email.</p>

                            <p style="color: #6b7280; font-size: 13px;">
                                This is an automated email from MediSync. Please do not reply.
                            </p>
                        </div>
                    `
                })
            }
        );

        if (!brevoResponse.ok) {
            const brevoError = await brevoResponse.text();

            console.error(
                "Brevo email error:",
                brevoResponse.status,
                brevoError
            );

            return res.status(500).json({
                message: "Failed to send password reset OTP."
            });
        }

        res.json({
            success: true,
            message: "OTP sent successfully."
        });

    } catch (error) {
        console.error("Send reset OTP error:", error);

        res.status(500).json({
            message: "Failed to send password reset OTP."
        });
    }
}

async function verifyResetOtp(req, res) {
    try {
        const { role, email, hospitalCode, otp } = req.body;

        let userResult;

        if (role === "manager") {
            userResult = await pool.query(
                `SELECT u.id
                 FROM users u
                 JOIN hospitals h ON u.hospital_id = h.id
                 WHERE h.code = $1
                 AND u.role = 'RESOURCE_MANAGER'`,
                [String(hospitalCode || "").toUpperCase()]
            );
        } else if (role === "hospital") {
            userResult = await pool.query(
                `SELECT id
                 FROM users
                 WHERE email = $1
                 AND role = 'HOSPITAL'`,
                [email]
            );
        } else {
            userResult = await pool.query(
                `SELECT id
                 FROM users
                 WHERE email = $1
                 AND role = 'PATIENT'`,
                [email]
            );
        }

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                message: "Account not found."
            });
        }

        const userId = userResult.rows[0].id;

        const otpResult = await pool.query(
            `SELECT *
             FROM password_reset_otps
             WHERE user_id = $1
             AND verified = false
             AND expires_at > NOW()
             ORDER BY created_at DESC
             LIMIT 1`,
            [userId]
        );

        if (otpResult.rows.length === 0) {
            return res.status(400).json({
                message: "OTP is invalid or expired."
            });
        }

        const reset = otpResult.rows[0];

        if (reset.attempts >= 5) {
            return res.status(400).json({
                message: "Too many OTP attempts. Please request a new OTP."
            });
        }

        const suppliedHash = hashOtp(String(otp));

        if (suppliedHash !== reset.otp_hash) {
            await pool.query(
                `UPDATE password_reset_otps
                 SET attempts = attempts + 1
                 WHERE id = $1`,
                [reset.id]
            );

            return res.status(400).json({
                message: "Invalid OTP."
            });
        }

        await pool.query(
            `UPDATE password_reset_otps
             SET verified = true
             WHERE id = $1`,
            [reset.id]
        );

        res.json({
            verified: true,
            message: "OTP verified successfully."
        });

    } catch (error) {
        console.error("Verify reset OTP error:", error);

        res.status(500).json({
            message: "Failed to verify OTP."
        });
    }
}

async function resetPassword(req, res) {
    try {
        const { role, email, hospitalCode, otp, newPassword } = req.body;

        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters."
            });
        }

        let userResult;

        if (role === "manager") {
            userResult = await pool.query(
                `SELECT u.id
                 FROM users u
                 JOIN hospitals h ON u.hospital_id = h.id
                 WHERE h.code = $1
                 AND u.role = 'RESOURCE_MANAGER'`,
                [String(hospitalCode || "").toUpperCase()]
            );
        } else if (role === "hospital") {
            userResult = await pool.query(
                `SELECT id
                 FROM users
                 WHERE email = $1
                 AND role = 'HOSPITAL'`,
                [email]
            );
        } else {
            userResult = await pool.query(
                `SELECT id
                 FROM users
                 WHERE email = $1
                 AND role = 'PATIENT'`,
                [email]
            );
        }

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                message: "Account not found."
            });
        }

        const userId = userResult.rows[0].id;

        const otpHash = hashOtp(String(otp));

        const otpResult = await pool.query(
            `SELECT id
             FROM password_reset_otps
             WHERE user_id = $1
             AND otp_hash = $2
             AND verified = true
             AND expires_at > NOW()
             ORDER BY created_at DESC
             LIMIT 1`,
            [userId, otpHash]
        );

        if (otpResult.rows.length === 0) {
            return res.status(400).json({
                message: "OTP verification required."
            });
        }

        const passwordHash = await bcrypt.hash(
            newPassword,
            10
        );

        await pool.query(
            `UPDATE users
             SET password_hash = $1
             WHERE id = $2`,
            [passwordHash, userId]
        );

        await pool.query(
            `DELETE FROM password_reset_otps
             WHERE user_id = $1`,
            [userId]
        );

        res.json({
            success: true,
            message: "Password reset successfully."
        });

    } catch (error) {
        console.error("Reset password error:", error);

        res.status(500).json({
            message: "Failed to reset password."
        });
    }
}

module.exports = {
    hospitalLogin,
    managerLogin,
    patientLogin,
    patientRegister,
    sendResetOtp,
    verifyResetOtp,
    resetPassword
};