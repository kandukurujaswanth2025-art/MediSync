const pool = require("../config/db");

async function getHospitals(req, res) {
    try {
        const result = await pool.query(
            `SELECT
                id,
                code,
                name,
                email,
                description,
                tagline
             FROM hospitals
             ORDER BY id`
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Get hospitals error:", error);

        res.status(500).json({
            message: "Failed to fetch hospitals"
        });
    }
}

async function getHospitalById(req, res) {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT
                id,
                code,
                name,
                email,
                description,
                tagline
             FROM hospitals
             WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Hospital not found"
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Get hospital error:", error);

        res.status(500).json({
            message: "Failed to fetch hospital"
        });
    }
}

module.exports = {
    getHospitals,
    getHospitalById
};