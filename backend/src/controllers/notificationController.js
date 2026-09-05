const pool = require("../config/db");

async function getNotifications(req, res) {
    try {
        const userId = req.user.userId;
        const hospitalId = req.user.hospitalId;

        let result;

        if (req.user.role === "PATIENT") {
            result = await pool.query(
                `SELECT
                    id,
                    hospital_id,
                    scope,
                    target_id,
                    title,
                    message,
                    read,
                    created_at
                 FROM notifications
                 WHERE scope = 'patient'
                 AND target_id = $1
                 ORDER BY created_at DESC`,
                [userId]
            );
        } else {
            result = await pool.query(
                `SELECT
                    id,
                    hospital_id,
                    scope,
                    target_id,
                    title,
                    message,
                    read,
                    created_at
                 FROM notifications
                 WHERE hospital_id = $1
                 AND (
                    scope = 'hospital'
                    OR scope = 'manager'
                 )
                 ORDER BY created_at DESC`,
                [hospitalId]
            );
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Get notifications error:", error);

        res.status(500).json({
            message: "Failed to fetch notifications"
        });
    }
}

async function markNotificationRead(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const hospitalId = req.user.hospitalId;

        let result;

        if (req.user.role === "PATIENT") {
            result = await pool.query(
                `UPDATE notifications
                 SET read = true
                 WHERE id = $1
                 AND scope = 'patient'
                 AND target_id = $2
                 RETURNING *`,
                [id, userId]
            );
        } else {
            result = await pool.query(
                `UPDATE notifications
                 SET read = true
                 WHERE id = $1
                 AND hospital_id = $2
                 RETURNING *`,
                [id, hospitalId]
            );
        }

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Notification not found"
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(
            "Mark notification read error:",
            error
        );

        res.status(500).json({
            message: "Failed to update notification"
        });
    }
}

module.exports = {
    getNotifications,
    markNotificationRead
};