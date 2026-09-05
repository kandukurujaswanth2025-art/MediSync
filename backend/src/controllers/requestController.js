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

        if (!resourceName || !quantity) {
            return res.status(400).json({
                message: "Resource name and quantity are required"
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
                resourceName,
                quantity,
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
                `${resourceName} request for ${quantity} unit(s) has been submitted.`
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

async function updateRequestStatus(req, res) {
    try {
        const {
            id
        } = req.params;

        const {
            status
        } = req.body;

        const hospitalId = req.user.hospitalId;

        const allowedStatuses = [
            "PENDING",
            "APPROVED",
            "COMPLETED",
            "REJECTED"
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

async function deleteRequest(req, res) {
    try {
        const {
            id
        } = req.params;

        const hospitalId = req.user.hospitalId;

        const result = await pool.query(
            `DELETE FROM resource_requests
             WHERE id = $1
             AND hospital_id = $2
             RETURNING id`,
            [
                id,
                hospitalId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Resource request not found"
            });
        }

        res.json({
            message: "Resource request deleted successfully"
        });
    } catch (error) {
        console.error(
            "Delete request error:",
            error
        );

        res.status(500).json({
            message: "Failed to delete resource request"
        });
    }
}

module.exports = {
    getRequests,
    createRequest,
    updateRequestStatus,
    deleteRequest
};