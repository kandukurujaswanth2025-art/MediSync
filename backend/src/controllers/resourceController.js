const pool = require("../config/db");

// ============================================================
// DEPARTMENTS
// ============================================================

async function getDepartments(req, res) {
    try {
        const hospitalId = req.user.hospitalId;

        const result = await pool.query(
            `SELECT
                id,
                hospital_id,
                name,
                description,
                created_at
             FROM departments
             WHERE hospital_id = $1
             ORDER BY id`,
            [hospitalId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Get departments error:", error);

        res.status(500).json({
            message: "Failed to fetch departments"
        });
    }
}

async function getDepartmentById(req, res) {
    try {
        const { id } = req.params;
        const hospitalId = req.user.hospitalId;

        const result = await pool.query(
            `SELECT
                id,
                hospital_id,
                name,
                description,
                created_at
             FROM departments
             WHERE id = $1
             AND hospital_id = $2`,
            [id, hospitalId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Department not found"
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Get department error:", error);

        res.status(500).json({
            message: "Failed to fetch department"
        });
    }
}

async function createDepartment(req, res) {
    try {
        const hospitalId = req.user.hospitalId;
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({
                message: "Department name is required"
            });
        }

        const id = `${hospitalId}-DEPT-${Date.now()}`;

        const result = await pool.query(
            `INSERT INTO departments
            (id, hospital_id, name, description)
            VALUES ($1, $2, $3, $4)
            RETURNING *`,
            [
                id,
                hospitalId,
                name,
                description || null
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Create department error:", error);

        res.status(500).json({
            message: "Failed to create department"
        });
    }
}

async function updateDepartment(req, res) {
    try {
        const { id } = req.params;
        const hospitalId = req.user.hospitalId;
        const { name, description } = req.body;

        const result = await pool.query(
            `UPDATE departments
             SET
                name = COALESCE($1, name),
                description = COALESCE($2, description)
             WHERE id = $3
             AND hospital_id = $4
             RETURNING *`,
            [
                name || null,
                description || null,
                id,
                hospitalId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Department not found"
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Update department error:", error);

        res.status(500).json({
            message: "Failed to update department"
        });
    }
}

async function deleteDepartment(req, res) {
    try {
        const { id } = req.params;
        const hospitalId = req.user.hospitalId;

        const resourceCheck = await pool.query(
            `SELECT COUNT(*) AS count
             FROM resources
             WHERE department_id = $1
             AND hospital_id = $2`,
            [id, hospitalId]
        );

        if (Number(resourceCheck.rows[0].count) > 0) {
            return res.status(400).json({
                message:
                    "Cannot delete department while resources are assigned to it"
            });
        }

        const result = await pool.query(
            `DELETE FROM departments
             WHERE id = $1
             AND hospital_id = $2
             RETURNING id`,
            [id, hospitalId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Department not found"
            });
        }

        res.json({
            message: "Department deleted successfully"
        });
    } catch (error) {
        console.error("Delete department error:", error);

        res.status(500).json({
            message: "Failed to delete department"
        });
    }
}

// ============================================================
// RESOURCES
// ============================================================

async function getResources(req, res) {
    try {
        const hospitalId = req.user.hospitalId;

        /*
         * The frontend sends:
         *
         * /resources?type=medicine
         * /resources?type=equipment
         *
         * Previously the backend ignored this parameter,
         * which caused medicines and equipment to be mixed.
         */
        const requestedType = String(
            req.query.type || ""
        ).toLowerCase();

        if (
            requestedType &&
            !["medicine", "equipment"].includes(
                requestedType
            )
        ) {
            return res.status(400).json({
                message: "Invalid resource type"
            });
        }

        const queryParams = [hospitalId];

        let typeCondition = "";

        if (requestedType) {
            queryParams.push(requestedType);
            typeCondition = `AND type = $2`;
        }

        /*
         * Medicine status is calculated directly from:
         *
         * quantity >= min_stock  -> AVAILABLE
         * quantity <  min_stock  -> OUT_OF_STOCK
         *
         * Equipment keeps its own status such as:
         * AVAILABLE
         * UNDER_MAINTENANCE
         * OUT_OF_SERVICE
         */
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
                CASE
                    WHEN type = 'medicine'
                        THEN CASE
                            WHEN quantity >= min_stock
                                THEN 'AVAILABLE'
                            ELSE 'OUT_OF_STOCK'
                        END
                    ELSE status
                END AS status,
                last_updated
             FROM resources
             WHERE hospital_id = $1
             ${typeCondition}
             ORDER BY id`,
            queryParams
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Get resources error:", error);

        res.status(500).json({
            message: "Failed to fetch resources"
        });
    }
}

async function getResourceById(req, res) {
    try {
        const { id } = req.params;
        const hospitalId = req.user.hospitalId;

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
                CASE
                    WHEN type = 'medicine'
                        THEN CASE
                            WHEN quantity >= min_stock
                                THEN 'AVAILABLE'
                            ELSE 'OUT_OF_STOCK'
                        END
                    ELSE status
                END AS status,
                last_updated
             FROM resources
             WHERE id = $1
             AND hospital_id = $2`,
            [
                id,
                hospitalId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Resource not found"
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Get resource error:", error);

        res.status(500).json({
            message: "Failed to fetch resource"
        });
    }
}

// ============================================================
// MEDICINE SEARCH
// ============================================================

async function searchMedicines(req, res) {
    try {
        const hospitalId = req.user.hospitalId;
        const search = String(
            req.query.search || ""
        ).trim();

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
                CASE
                    WHEN quantity >= min_stock
                        THEN 'AVAILABLE'
                    ELSE 'OUT_OF_STOCK'
                END AS status,
                last_updated
             FROM resources
             WHERE hospital_id = $1
             AND type = 'medicine'
             AND name ILIKE $2
             ORDER BY name`,
            [
                hospitalId,
                `%${search}%`
            ]
        );

        res.json(result.rows);
    } catch (error) {
        console.error(
            "Search medicines error:",
            error
        );

        res.status(500).json({
            message: "Failed to search medicines"
        });
    }
}

// ============================================================
// CREATE RESOURCE
// ============================================================

async function createResource(req, res) {
    try {
        const hospitalId = req.user.hospitalId;

        const {
            departmentId,
            departmentName,
            type,
            name,
            quantity,
            minStock,
            unit,
            status
        } = req.body;

        if (!name || !type) {
            return res.status(400).json({
                message:
                    "Resource name and type are required"
            });
        }

        if (
            !["medicine", "equipment"].includes(type)
        ) {
            return res.status(400).json({
                message:
                    "Invalid resource type"
            });
        }

        const numericQuantity =
            Number(quantity) || 0;

        const numericMinStock =
            Number(minStock) || 0;

        /*
         * Medicine status is NEVER manually controlled.
         * It is always calculated from quantity/minStock.
         */
        const finalStatus =
            type === "medicine"
                ? numericQuantity >= numericMinStock
                    ? "AVAILABLE"
                    : "OUT_OF_STOCK"
                : status || "AVAILABLE";

        const prefix =
            type === "medicine"
                ? "MED"
                : "EQP";

        const id =
            `${hospitalId}-${prefix}-${Date.now()}`;

        const result = await pool.query(
            `INSERT INTO resources
            (
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
            )
            VALUES
            (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9, $10, NOW()
            )
            RETURNING *`,
            [
                id,
                hospitalId,
                departmentId || null,
                departmentName || null,
                type,
                name,
                numericQuantity,
                numericMinStock,
                unit || "units",
                finalStatus
            ]
        );

        res.status(201).json(
            result.rows[0]
        );
    } catch (error) {
        console.error(
            "Create resource error:",
            error
        );

        res.status(500).json({
            message:
                "Failed to create resource"
        });
    }
}

// ============================================================
// UPDATE RESOURCE
// ============================================================

async function updateResource(req, res) {
    try {
        const { id } = req.params;
        const hospitalId = req.user.hospitalId;

        const {
            departmentId,
            departmentName,
            name,
            quantity,
            minStock,
            unit,
            status
        } = req.body;

        /*
         * First get the existing resource so we know
         * whether it is medicine or equipment.
         */
        const existingResult =
            await pool.query(
                `SELECT
                    id,
                    type,
                    quantity,
                    min_stock,
                    status
                 FROM resources
                 WHERE id = $1
                 AND hospital_id = $2`,
                [
                    id,
                    hospitalId
                ]
            );

        if (
            existingResult.rows.length === 0
        ) {
            return res.status(404).json({
                message:
                    "Resource not found"
            });
        }

        const existing =
            existingResult.rows[0];

        /*
         * Use the new values when supplied.
         * Otherwise keep the existing values.
         */
        const finalQuantity =
            quantity !== undefined &&
            quantity !== null
                ? Number(quantity)
                : Number(existing.quantity);

        const finalMinStock =
            minStock !== undefined &&
            minStock !== null
                ? Number(minStock)
                : Number(existing.min_stock);

        let finalStatus;

        if (existing.type === "medicine") {
            /*
             * Medicine:
             *
             * quantity >= minStock -> AVAILABLE
             * quantity < minStock  -> OUT_OF_STOCK
             */
            finalStatus =
                finalQuantity >= finalMinStock
                    ? "AVAILABLE"
                    : "OUT_OF_STOCK";
        } else {
            /*
             * Equipment keeps its manually selected
             * operational status.
             */
            finalStatus =
                status || existing.status;
        }

        const result = await pool.query(
            `UPDATE resources
             SET
                department_id = COALESCE($1, department_id),
                department_name = COALESCE($2, department_name),
                name = COALESCE($3, name),
                quantity = $4,
                min_stock = $5,
                unit = COALESCE($6, unit),
                status = $7,
                last_updated = NOW()
             WHERE id = $8
             AND hospital_id = $9
             RETURNING *`,
            [
                departmentId || null,
                departmentName || null,
                name || null,
                finalQuantity,
                finalMinStock,
                unit || null,
                finalStatus,
                id,
                hospitalId
            ]
        );

        res.json(
            result.rows[0]
        );
    } catch (error) {
        console.error(
            "Update resource error:",
            error
        );

        res.status(500).json({
            message:
                "Failed to update resource"
        });
    }
}

// ============================================================
// DELETE RESOURCE
// ============================================================

async function deleteResource(req, res) {
    try {
        const { id } = req.params;
        const hospitalId = req.user.hospitalId;

        const result = await pool.query(
            `DELETE FROM resources
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
                    "Resource not found"
            });
        }

        res.json({
            message:
                "Resource deleted successfully"
        });
    } catch (error) {
        console.error(
            "Delete resource error:",
            error
        );

        res.status(500).json({
            message:
                "Failed to delete resource"
        });
    }
}

// ============================================================
// STOCK HISTORY
// ============================================================

async function getStockHistory(req, res) {
    try {
        const hospitalId = req.user.hospitalId;

        const result = await pool.query(
            `SELECT
                id,
                hospital_id,
                resource_id,
                resource_name,
                change,
                reason,
                date
             FROM stock_history
             WHERE hospital_id = $1
             ORDER BY date DESC`,
            [hospitalId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error(
            "Stock history error:",
            error
        );

        res.status(500).json({
            message:
                "Failed to fetch stock history"
        });
    }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    getDepartments,
    getDepartmentById,
    createDepartment,
    updateDepartment,
    deleteDepartment,

    getResources,
    getStockHistory,
    getResourceById,
    searchMedicines,

    createResource,
    updateResource,
    deleteResource
};