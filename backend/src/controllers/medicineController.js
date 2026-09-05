const pool = require("../config/db");

async function searchMedicines(req, res) {
    try {
        const hospitalId = req.user.hospitalId;
        const search = String(req.query.search || "").trim();

        const result = await pool.query(
            `SELECT
                id,
                hospital_id,
                department_id,
                department_name,
                type,
                name,
                quantity,
                min_stock,
                unit,
                status,
                last_updated
             FROM resources
             WHERE hospital_id = $1
             AND type = 'medicine'
             AND name ILIKE $2
             ORDER BY name`,
            [hospitalId, `%${search}%`]
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Search medicines error:", error);

        res.status(500).json({
            message: "Failed to search medicines"
        });
    }
}

async function createPrescription(req, res) {
    const client = await pool.connect();

    try {
        const hospitalId = req.user.hospitalId;

        const {
            queueEntryId,
            patientId,
            patientName,
            items
        } = req.body;

        if (
            !queueEntryId ||
            !patientName ||
            !Array.isArray(items) ||
            items.length === 0
        ) {
            return res.status(400).json({
                message: "Queue entry, patient name and medicines are required"
            });
        }

        const queueResult = await client.query(
            `SELECT *
             FROM queue_entries
             WHERE id = $1
             AND hospital_id = $2`,
            [queueEntryId, hospitalId]
        );

        if (queueResult.rows.length === 0) {
            return res.status(404).json({
                message: "Queue entry not found"
            });
        }

        const queueEntry = queueResult.rows[0];

        await client.query("BEGIN");

        const medicineDetails = [];

        for (const item of items) {
            if (!item.medicineId || !item.quantity) {
                await client.query("ROLLBACK");

                return res.status(400).json({
                    message: "Each medicine must have an ID and quantity"
                });
            }

            const quantity = Number(item.quantity);

            if (!Number.isInteger(quantity) || quantity <= 0) {
                await client.query("ROLLBACK");

                return res.status(400).json({
                    message: "Medicine quantity must be a positive integer"
                });
            }

            const medicineResult = await client.query(
                `SELECT *
                 FROM resources
                 WHERE id = $1
                 AND hospital_id = $2
                 AND type = 'medicine'
                 FOR UPDATE`,
                [item.medicineId, hospitalId]
            );

            if (medicineResult.rows.length === 0) {
                await client.query("ROLLBACK");

                return res.status(404).json({
                    message: `Medicine ${item.medicineId} not found`
                });
            }

            const medicine = medicineResult.rows[0];

            if (medicine.quantity < quantity) {
                await client.query("ROLLBACK");

                return res.status(400).json({
                    message: `Insufficient stock for ${medicine.name}. Available: ${medicine.quantity}`
                });
            }

            medicineDetails.push({
                medicineId: medicine.id,
                medicineName: medicine.name,
                quantity
            });
        }

        const orderId = `MO${Date.now()}`;

        const orderResult = await client.query(
            `INSERT INTO medicine_orders
            (
                id,
                hospital_id,
                patient_id,
                patient_name,
                queue_entry_id,
                status,
                created_at
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                'READY_FOR_COLLECTION',
                NOW()
            )
            RETURNING *`,
            [
                orderId,
                hospitalId,
                patientId || queueEntry.patient_id || null,
                patientName,
                queueEntryId
            ]
        );

        for (const medicine of medicineDetails) {
            await client.query(
                `INSERT INTO medicine_order_items
                (
                    order_id,
                    medicine_id,
                    medicine_name,
                    quantity
                )
                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4
                )`,
                [
                    orderId,
                    medicine.medicineId,
                    medicine.medicineName,
                    medicine.quantity
                ]
            );

            await client.query(
                `UPDATE resources
                 SET quantity = quantity - $1,
                     last_updated = NOW()
                 WHERE id = $2
                 AND hospital_id = $3`,
                [
                    medicine.quantity,
                    medicine.medicineId,
                    hospitalId
                ]
            );

            await client.query(
                `INSERT INTO stock_history
                (
                    id,
                    hospital_id,
                    resource_id,
                    resource_name,
                    change,
                    reason,
                    date
                )
                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    NOW()
                )`,
                [
                    `SH${Date.now()}${Math.floor(Math.random() * 1000)}`,
                    hospitalId,
                    medicine.medicineId,
                    medicine.medicineName,
                    -medicine.quantity,
                    `Prescription for ${patientName}`
                ]
            );
        }

        await client.query(
            `UPDATE queue_entries
             SET medicine_order_id = $1
             WHERE id = $2
             AND hospital_id = $3`,
            [
                orderId,
                queueEntryId,
                hospitalId
            ]
        );

        if (queueEntry.patient_id) {
            await client.query(
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
                    `NT${Date.now()}${Math.floor(Math.random() * 1000)}`,
                    hospitalId,
                    queueEntry.patient_id,
                    "Prescription Ready",
                    `Your prescription has been prepared. ${medicineDetails.length} medicine(s) are ready for collection.`
                ]
            );
        }

        await client.query("COMMIT");

        res.status(201).json({
            message: "Prescription created successfully",
            order: orderResult.rows[0],
            items: medicineDetails
        });
    } catch (error) {
        await client.query("ROLLBACK");

        console.error(
            "Create prescription error:",
            error
        );

        res.status(500).json({
            message: "Failed to create prescription"
        });
    } finally {
        client.release();
    }
}

async function getPrescription(req, res) {
    try {
        const { orderId } = req.params;

        let result;

        if (req.user.role === "PATIENT") {
            result = await pool.query(
                `SELECT
                    mo.id,
                    mo.hospital_id,
                    mo.patient_id,
                    mo.patient_name,
                    mo.queue_entry_id,
                    mo.status,
                    mo.created_at,
                    moi.medicine_id,
                    moi.medicine_name,
                    moi.quantity
                 FROM medicine_orders mo
                 JOIN medicine_order_items moi
                    ON mo.id = moi.order_id
                 WHERE mo.id = $1
                 AND mo.patient_id = $2
                 ORDER BY moi.medicine_name`,
                [
                    orderId,
                    req.user.userId
                ]
            );
        } else {
            result = await pool.query(
                `SELECT
                    mo.id,
                    mo.hospital_id,
                    mo.patient_id,
                    mo.patient_name,
                    mo.queue_entry_id,
                    mo.status,
                    mo.created_at,
                    moi.medicine_id,
                    moi.medicine_name,
                    moi.quantity
                 FROM medicine_orders mo
                 JOIN medicine_order_items moi
                    ON mo.id = moi.order_id
                 WHERE mo.id = $1
                 AND mo.hospital_id = $2
                 ORDER BY moi.medicine_name`,
                [
                    orderId,
                    req.user.hospitalId
                ]
            );
        }

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Prescription not found"
            });
        }

        const first = result.rows[0];

        res.json({
            id: first.id,
            hospitalId: first.hospital_id,
            patientId: first.patient_id,
            patientName: first.patient_name,
            queueEntryId: first.queue_entry_id,
            status: first.status,
            createdAt: first.created_at,
            items: result.rows.map(row => ({
                medicineId: row.medicine_id,
                medicineName: row.medicine_name,
                quantity: row.quantity
            }))
        });
    } catch (error) {
        console.error(
            "Get prescription error:",
            error
        );

        res.status(500).json({
            message: "Failed to fetch prescription"
        });
    }
}

async function getMyPrescriptions(req, res) {
    try {
        const result = await pool.query(
            `SELECT
                mo.id,
                mo.hospital_id,
                mo.patient_id,
                mo.patient_name,
                mo.queue_entry_id,
                mo.status,
                mo.created_at,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'medicineId', moi.medicine_id,
                            'medicineName', moi.medicine_name,
                            'quantity', moi.quantity
                        )
                    ) FILTER (WHERE moi.id IS NOT NULL),
                    '[]'
                ) AS items
             FROM medicine_orders mo
             LEFT JOIN medicine_order_items moi
                ON mo.id = moi.order_id
             WHERE mo.patient_id = $1
             GROUP BY
                mo.id,
                mo.hospital_id,
                mo.patient_id,
                mo.patient_name,
                mo.queue_entry_id,
                mo.status,
                mo.created_at
             ORDER BY mo.created_at DESC`,
            [req.user.userId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error(
            "Get my prescriptions error:",
            error
        );

        res.status(500).json({
            message: "Failed to fetch prescriptions"
        });
    }
}

module.exports = {
    searchMedicines,
    createPrescription,
    getPrescription,
    getMyPrescriptions
};