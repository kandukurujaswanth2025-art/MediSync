const pool = require("../config/db");

const AVG_WAIT_MINUTES = 10;

function sortQueue(a, b) {
    if (a.priority === "EMERGENCY" && b.priority !== "EMERGENCY") {
        return -1;
    }

    if (a.priority !== "EMERGENCY" && b.priority === "EMERGENCY") {
        return 1;
    }

    return new Date(a.registered_at) - new Date(b.registered_at);
}

async function getQueue(req, res) {
    try {
        const hospitalId = req.user.hospitalId;

        const result = await pool.query(
            `SELECT
                id,
                hospital_id,
                patient_id,
                patient_name,
                problem,
                token,
                registered_at,
                status,
                medicine_order_id,
                priority
             FROM queue_entries
             WHERE hospital_id = $1
             AND status != 'COMPLETED'
             ORDER BY registered_at`,
            [hospitalId]
        );

        const queue = result.rows.sort(sortQueue);

        res.json(queue);
    } catch (error) {
        console.error("Get queue error:", error);

        res.status(500).json({
            message: "Failed to fetch queue"
        });
    }
}

async function registerVisit(req, res) {
    try {
        const hospitalId =
            req.user.role === "PATIENT"
                ? req.body.hospitalId
                : req.user.hospitalId;

        const patientId =
            req.user.role === "PATIENT"
                ? req.user.userId
                : req.body.patientId;

        const {
            patientName,
            problem
        } = req.body;

        if (!hospitalId) {
            return res.status(400).json({
                message: "Hospital is required"
            });
        }

        if (!patientId || !patientName || !problem) {
            return res.status(400).json({
                message: "Patient, name and problem are required"
            });
        }

        const hospitalCheck = await pool.query(
            `SELECT id
             FROM hospitals
             WHERE id = $1`,
            [hospitalId]
        );

        if (hospitalCheck.rows.length === 0) {
            return res.status(404).json({
                message: "Hospital not found"
            });
        }

        const priority =
            problem.toUpperCase() === "EMERGENCY"
                ? "EMERGENCY"
                : "NORMAL";

        const client = await pool.connect();

        try {
            await client.query("BEGIN");

            const counterResult = await client.query(
                `SELECT current_value
                 FROM counters
                 WHERE hospital_id = $1
                 FOR UPDATE`,
                [hospitalId]
            );

            if (counterResult.rows.length === 0) {
                await client.query("ROLLBACK");

                return res.status(404).json({
                    message: "Hospital counter not found"
                });
            }

            const nextValue =
                Number(counterResult.rows[0].current_value) + 1;

            await client.query(
                `UPDATE counters
                 SET current_value = $1
                 WHERE hospital_id = $2`,
                [nextValue, hospitalId]
            );

            const token =
                `P-${String(nextValue).padStart(3, "0")}`;

            const id = `QE${Date.now()}`;

            const result = await client.query(
                `INSERT INTO queue_entries
                (
                    id,
                    hospital_id,
                    patient_id,
                    patient_name,
                    problem,
                    token,
                    registered_at,
                    status,
                    medicine_order_id,
                    priority
                )
                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    NOW(),
                    'WAITING',
                    NULL,
                    $7
                )
                RETURNING *`,
                [
                    id,
                    hospitalId,
                    patientId,
                    patientName,
                    problem,
                    token,
                    priority
                ]
            );

            await client.query("COMMIT");

            res.status(201).json(result.rows[0]);
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Register visit error:", error);

        res.status(500).json({
            message: "Failed to register visit"
        });
    }
}

async function getMyQueueEntry(req, res) {
    try {
        const patientId = req.user.userId;

        const result = await pool.query(
            `SELECT
                id,
                hospital_id,
                patient_id,
                patient_name,
                problem,
                token,
                registered_at,
                status,
                medicine_order_id,
                priority
             FROM queue_entries
             WHERE patient_id = $1
             AND status != 'COMPLETED'
             ORDER BY registered_at DESC
             LIMIT 1`,
            [patientId]
        );

        if (result.rows.length === 0) {
            return res.json(null);
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Get my queue error:", error);

        res.status(500).json({
            message: "Failed to fetch your queue entry"
        });
    }
}

async function getQueuePosition(req, res) {
    try {
        const { id } = req.params;

        const currentResult = await pool.query(
            `SELECT *
             FROM queue_entries
             WHERE id = $1`,
            [id]
        );

        if (currentResult.rows.length === 0) {
            return res.status(404).json({
                message: "Queue entry not found"
            });
        }

        const current = currentResult.rows[0];

        if (
            req.user.role === "PATIENT" &&
            current.patient_id !== req.user.userId
        ) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        if (
            req.user.role !== "PATIENT" &&
            current.hospital_id !== req.user.hospitalId
        ) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        if (current.status === "COMPLETED") {
            return res.json({
                position: 0,
                patientsAhead: 0,
                estimatedWaitMinutes: 0
            });
        }

        const hospitalId = current.hospital_id;

        const queueResult = await pool.query(
            `SELECT
                id,
                hospital_id,
                patient_id,
                patient_name,
                problem,
                token,
                registered_at,
                status,
                medicine_order_id,
                priority
             FROM queue_entries
             WHERE hospital_id = $1
             AND status IN ('WAITING', 'CALLED', 'IN_CONSULTATION')`,
            [hospitalId]
        );

        const queue = queueResult.rows
                .filter((entry) => entry.status === "WAITING")
                .sort(sortQueue);

        const index = queue.findIndex(
            (entry) => entry.id === id
        );

            if (index === -1) {
                return res.json({
                    position: 0,
                    patientsAhead: 0,
                    estimatedWaitMinutes: 0
                });
            }

            const position = index + 1;

            const patientsAhead = index;

            const estimatedWaitMinutes =
                patientsAhead * AVG_WAIT_MINUTES;

       

        res.json({
            position,
            patientsAhead,
            estimatedWaitMinutes
        });

    } catch (error) {
        console.error("Queue position error:", error);

        res.status(500).json({
            message: "Failed to calculate queue position"
        });
    }
}

async function getCurrentlyServing(req, res) {
    try {
        const hospitalId = req.user.hospitalId;

        const result = await pool.query(
            `SELECT *
             FROM queue_entries
             WHERE hospital_id = $1
             AND status IN (
                 'CALLED',
                 'IN_CONSULTATION'
             )
             ORDER BY
                 CASE
                     WHEN status = 'IN_CONSULTATION' THEN 0
                     ELSE 1
                 END,
                 registered_at
             LIMIT 1`,
            [hospitalId]
        );

        res.json(
            result.rows.length > 0
                ? result.rows[0]
                : null
        );
    } catch (error) {
        console.error(
            "Currently serving error:",
            error
        );

        res.status(500).json({
            message: "Failed to get current patient"
        });
    }
}

async function callPatient(req, res) {
    try {
        const { id } = req.params;
        const hospitalId = req.user.hospitalId;

        const activeConsultation = await pool.query(
            `SELECT id
             FROM queue_entries
             WHERE hospital_id = $1
             AND status = 'IN_CONSULTATION'
             LIMIT 1`,
            [hospitalId]
        );

        if (activeConsultation.rows.length > 0) {
            return res.status(400).json({
                message:
                    "Current consultation must be completed before calling the next patient"
            });
        }

        const result = await pool.query(
            `UPDATE queue_entries
             SET status = 'CALLED'
             WHERE id = $1
             AND hospital_id = $2
             AND status = 'WAITING'
             RETURNING *`,
            [id, hospitalId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Waiting patient not found"
            });
        }

        const patient = result.rows[0];

        const message =
            patient.priority === "EMERGENCY"
                ? `Emergency patient ${patient.token} has been called. Please proceed to consultation.`
                : `Your token ${patient.token} has been called. Please proceed to the consultation room.`;

        if (patient.patient_id) {
            await pool.query(
                `INSERT INTO notifications
                (
                    id,
                    hospital_id,
                    scope,
                    target_id,
                    title,
                    message,
                    read,
                    created_at
                )
                VALUES
                (
                    $1,
                    $2,
                    'patient',
                    $3,
                    $4,
                    $5,
                    false,
                    NOW()
                )`,
                [
                    `NT${Date.now()}`,
                    hospitalId,
                    patient.patient_id,
                    patient.priority === "EMERGENCY"
                        ? "🚨 Emergency Call"
                        : "Your Token Has Been Called",
                    message
                ]
            );
        }

        res.json(patient);
    } catch (error) {
        console.error("Call patient error:", error);

        res.status(500).json({
            message: "Failed to call patient"
        });
    }
}

async function startConsultation(req, res) {
    try {
        const { id } = req.params;
        const hospitalId = req.user.hospitalId;

        const result = await pool.query(
            `UPDATE queue_entries
             SET status = 'IN_CONSULTATION'
             WHERE id = $1
             AND hospital_id = $2
             AND status = 'CALLED'
             RETURNING *`,
            [id, hospitalId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Called patient not found"
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(
            "Start consultation error:",
            error
        );

        res.status(500).json({
            message: "Failed to start consultation"
        });
    }
}

async function completeConsultation(req, res) {
    try {
        const { id } = req.params;
        const hospitalId = req.user.hospitalId;

        const result = await pool.query(
            `UPDATE queue_entries
             SET status = 'COMPLETED'
             WHERE id = $1
             AND hospital_id = $2
             AND status = 'IN_CONSULTATION'
             RETURNING *`,
            [id, hospitalId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message:
                    "Patient in consultation not found"
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(
            "Complete consultation error:",
            error
        );

        res.status(500).json({
            message:
                "Failed to complete consultation"
        });
    }
}

async function getHospitalStats(req, res) {
    try {
        const hospitalId = req.user.hospitalId;

        const result = await pool.query(
            `SELECT
                COUNT(*) FILTER (
                    WHERE status = 'WAITING'
                ) AS waiting,

                COUNT(*) FILTER (
                    WHERE status = 'CALLED'
                ) AS called,

                COUNT(*) FILTER (
                    WHERE status = 'IN_CONSULTATION'
                ) AS in_consultation,

                COUNT(*) FILTER (
                    WHERE status = 'COMPLETED'
                ) AS completed,

                COUNT(*) AS total

             FROM queue_entries
             WHERE hospital_id = $1`,
            [hospitalId]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error(
            "Hospital stats error:",
            error
        );

        res.status(500).json({
            message:
                "Failed to fetch hospital statistics"
        });
    }
}
async function getVisitHistory(req, res) {
    try {
        const patientId = req.user.userId;

        const result = await pool.query(
            `SELECT
                id,
                hospital_id,
                patient_id,
                patient_name,
                problem,
                token,
                registered_at,
                status,
                medicine_order_id,
                priority
             FROM queue_entries
             WHERE patient_id = $1
             ORDER BY registered_at DESC`,
            [patientId]
        );

        res.json(result.rows);

    } catch (error) {
        console.error("Visit history error:", error);

        res.status(500).json({
            message: "Failed to fetch visit history"
        });
    }
}
module.exports = {
    getQueue,
    registerVisit,
    getMyQueueEntry,
    getQueuePosition,
    getCurrentlyServing,
    callPatient,
    startConsultation,
    completeConsultation,
    getHospitalStats,
    getVisitHistory
};