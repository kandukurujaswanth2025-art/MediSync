const pool = require("../config/db");

async function getRequests(req, res) {
    try {
        const hospitalId = req.user.hospitalId;

        const result = await pool.query(
            `SELECT
                id,
                hospital_id,
                resource_name,
                quantity,
                reason,
                status,
                date
             FROM resource_requests
             WHERE hospital_id = $1
             AND status IN ('PENDING', 'COMPLETED')
             ORDER BY date DESC`,
            [hospitalId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Get requests error:", error);

        res.status(500).json({
            message: "Failed to fetch resource requests"
        });
    }
}

async function createRequest(req, res) {
    try {
        const hospitalId = req.user.hospitalId;

        const {
            resourceName,
            quantity,
            reason
        } = req.body;

        const cleanResourceName =
            String(resourceName || "").trim();

        const requestedQuantity =
            Number(quantity);

        if (!cleanResourceName) {
            return res.status(400).json({
                message: "Resource name is required"
            });
        }

        if (
            !Number.isFinite(requestedQuantity) ||
            requestedQuantity <= 0
        ) {
            return res.status(400).json({
                message: "Quantity must be greater than 0"
            });
        }

        const id = `RR${Date.now()}`;

        const result = await pool.query(
            `INSERT INTO resource_requests
            (
                id,
                hospital_id,
                resource_name,
                quantity,
                reason,
                status,
                date
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                'PENDING',
                NOW()
            )
            RETURNING *`,
            [
                id,
                hospitalId,
                cleanResourceName,
                requestedQuantity,
                reason || null
            ]
        );

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
                'manager',
                NULL,
                $3,
                $4,
                false,
                NOW()
            )`,
            [
                `NT${Date.now()}${Math.floor(Math.random() * 1000)}`,
                hospitalId,
                "New Resource Request",
                `${cleanResourceName} request for ${requestedQuantity} unit(s) has been submitted.`
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Create request error:", error);

        res.status(500).json({
            message: "Failed to create resource request"
        });
    }
}

/*
 * Normal request status update.
 *
 * The application now uses only:
 *
 * PENDING
 * COMPLETED
 *
 * Actual completion should happen through
 * fulfillRequest() when the manager adds stock.
 */
async function updateRequestStatus(req, res) {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const hospitalId = req.user.hospitalId;

        const allowedStatuses = [
            "PENDING",
            "COMPLETED"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid request status"
            });
        }

        const result = await pool.query(
            `UPDATE resource_requests
             SET status = $1
             WHERE id = $2
             AND hospital_id = $3
             RETURNING *`,
            [
                status,
                id,
                hospitalId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Resource request not found"
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(
            "Update request status error:",
            error
        );

        res.status(500).json({
            message: "Failed to update request status"
        });
    }
}

/*
 * Fulfill a resource request.
 *
 * Manager enters the actual received quantity.
 *
 * Workflow:
 *
 * 1. Find and lock the request.
 * 2. Verify that it is PENDING.
 * 3. Search for the resource in this hospital.
 * 4. If it exists:
 *      increase its quantity.
 *
 * 5. If it does NOT exist:
 *      create a new medicine resource.
 *
 * 6. Record stock history.
 * 7. Change request status:
 *
 *      PENDING -> COMPLETED
 *
 * Everything happens inside one transaction.
 */
async function fulfillRequest(req, res) {
    const client = await pool.connect();

    try {
        const { id } = req.params;
        const hospitalId = req.user.hospitalId;

        const receivedQty =
            Number(req.body.receivedQty);

        if (
            !Number.isFinite(receivedQty) ||
            receivedQty <= 0
        ) {
            return res.status(400).json({
                message:
                    "Received quantity must be greater than 0"
            });
        }

        await client.query("BEGIN");

        // --------------------------------------------------
        // FIND AND LOCK REQUEST
        // --------------------------------------------------

        const requestResult =
            await client.query(
                `SELECT
                    id,
                    hospital_id,
                    resource_name,
                    quantity,
                    reason,
                    status,
                    date
                 FROM resource_requests
                 WHERE id = $1
                 AND hospital_id = $2
                 FOR UPDATE`,
                [
                    id,
                    hospitalId
                ]
            );

        if (requestResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                message:
                    "Resource request not found"
            });
        }

        const request =
            requestResult.rows[0];

        // --------------------------------------------------
        // ONLY PENDING REQUESTS CAN BE FULFILLED
        // --------------------------------------------------

        if (
            request.status !==
            "PENDING"
        ) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                message:
                    "Only pending requests can be fulfilled"
            });
        }

        // --------------------------------------------------
        // SEARCH EXISTING RESOURCE
        // --------------------------------------------------

        const resourceResult =
            await client.query(
                `SELECT
                    id,
                    name,
                    type,
                    department_id,
                    quantity,
                    min_stock,
                    unit,
                    status
                 FROM resources
                 WHERE hospital_id = $1
                 AND LOWER(TRIM(name)) =
                     LOWER(TRIM($2))
                 FOR UPDATE`,
                [
                    hospitalId,
                    request.resource_name
                ]
            );

        let resource;
        let newQuantity;

        // ==================================================
        // EXISTING RESOURCE
        // ==================================================

        if (
            resourceResult.rows.length > 0
        ) {
            resource =
                resourceResult.rows[0];

            newQuantity =
                Number(resource.quantity) +
                receivedQty;

            /*
             * For medicines, availability is
             * automatically determined from:
             *
             * quantity >= min_stock
             *
             * Equipment keeps its existing
             * operational status.
             */
            let newStatus =
                resource.status;

            if (
                resource.type ===
                "medicine"
            ) {
                newStatus =
                    newQuantity >=
                    Number(resource.min_stock)
                        ? "AVAILABLE"
                        : "OUT_OF_STOCK";
            }

            await client.query(
                `UPDATE resources
                 SET
                    quantity = $1,
                    status = $2,
                    last_updated = NOW()
                 WHERE id = $3`,
                [
                    newQuantity,
                    newStatus,
                    resource.id
                ]
            );

        // ==================================================
        // NEW RESOURCE
        // ==================================================

        } else {

            /*
             * The requested resource does not
             * currently exist.
             *
             * Since this request is coming from
             * the hospital's resource request
             * system, create it as a MEDICINE.
             *
             * A default department is selected
             * if one exists for this hospital.
             */

            const departmentResult =
                await client.query(
                    `SELECT id
                     FROM departments
                     WHERE hospital_id = $1
                     ORDER BY id
                     LIMIT 1`,
                    [hospitalId]
                );

            const departmentId =
                departmentResult.rows.length > 0
                    ? departmentResult.rows[0].id
                    : null;

            const resourceId =
                `RES${Date.now()}${Math.floor(
                    Math.random() * 1000
                )}`;

            const cleanName =
                String(
                    request.resource_name
                ).trim();

            const minStock = 0;

            newQuantity =
                receivedQty;

            const newStatus =
                "AVAILABLE";

            const newResourceResult =
                await client.query(
                    `INSERT INTO resources
                    (
                        id,
                        hospital_id,
                        department_id,
                        type,
                        name,
                        quantity,
                        min_stock,
                        unit,
                        status,
                        last_updated
                    )
                    VALUES
                    (
                        $1,
                        $2,
                        $3,
                        'medicine',
                        $4,
                        $5,
                        $6,
                        'units',
                        $7,
                        NOW()
                    )
                    RETURNING
                        id,
                        name,
                        type,
                        department_id,
                        quantity,
                        min_stock,
                        unit,
                        status,
                        last_updated`,
                    [
                        resourceId,
                        hospitalId,
                        departmentId,
                        cleanName,
                        newQuantity,
                        minStock,
                        newStatus
                    ]
                );

            resource =
                newResourceResult.rows[0];
        }

        // --------------------------------------------------
        // RECORD STOCK HISTORY
        // --------------------------------------------------

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
                `SH${Date.now()}${Math.floor(
                    Math.random() * 1000
                )}`,
                hospitalId,
                resource.id,
                resource.name,
                receivedQty,
                `Resource request fulfilled: ${request.id}`
            ]
        );

        // --------------------------------------------------
        // PENDING -> COMPLETED
        // --------------------------------------------------

        const updatedRequestResult =
            await client.query(
                `UPDATE resource_requests
                 SET status = 'COMPLETED'
                 WHERE id = $1
                 AND hospital_id = $2
                 RETURNING *`,
                [
                    id,
                    hospitalId
                ]
            );

        // --------------------------------------------------
        // COMMIT TRANSACTION
        // --------------------------------------------------

        await client.query("COMMIT");

        res.json({
            request:
                updatedRequestResult.rows[0],

            resource: {
                id: resource.id,
                name: resource.name,
                type: resource.type,
                quantity: newQuantity,
                status:
                    resource.type ===
                    "medicine"
                        ? (
                            newQuantity >=
                            Number(
                                resource.min_stock
                            )
                                ? "AVAILABLE"
                                : "OUT_OF_STOCK"
                        )
                        : resource.status
            },

            receivedQty
        });

    } catch (error) {

        try {
            await client.query(
                "ROLLBACK"
            );
        } catch (rollbackError) {
            console.error(
                "Rollback error:",
                rollbackError
            );
        }

        console.error(
            "Fulfill request error:",
            error
        );

        res.status(500).json({
            message:
                "Failed to fulfill resource request"
        });

    } finally {
        client.release();
    }
}

/*
 * Delete a resource request.
 */
async function deleteRequest(req, res) {
    try {
        const { id } = req.params;

        const hospitalId =
            req.user.hospitalId;

        const result =
            await pool.query(
                `DELETE FROM resource_requests
                 WHERE id = $1
                 AND hospital_id = $2
                 RETURNING id`,
                [
                    id,
                    hospitalId
                ]
            );

        if (
            result.rows.length === 0
        ) {
            return res.status(404).json({
                message:
                    "Resource request not found"
            });
        }

        res.json({
            message:
                "Resource request deleted successfully"
        });

    } catch (error) {

        console.error(
            "Delete request error:",
            error
        );

        res.status(500).json({
            message:
                "Failed to delete resource request"
        });
    }
}

module.exports = {
    getRequests,
    createRequest,
    updateRequestStatus,
    fulfillRequest,
    deleteRequest
};