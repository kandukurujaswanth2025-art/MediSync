const express = require("express");

const {
    getDepartments,
    getDepartmentById,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    getResources,
    getResourceById,
    searchMedicines,
    createResource,
    updateResource,
    deleteResource,
    getStockHistory
} = require("../controllers/resourceController");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateToken);

router.get(
    "/departments",
    authorizeRoles("HOSPITAL", "RESOURCE_MANAGER"),
    getDepartments
);

router.get(
    "/departments/:id",
    authorizeRoles("HOSPITAL", "RESOURCE_MANAGER"),
    getDepartmentById
);

router.post(
    "/departments",
    authorizeRoles("RESOURCE_MANAGER"),
    createDepartment
);

router.put(
    "/departments/:id",
    authorizeRoles("RESOURCE_MANAGER"),
    updateDepartment
);

router.delete(
    "/departments/:id",
    authorizeRoles("RESOURCE_MANAGER"),
    deleteDepartment
);

router.get(
    "/",
    authorizeRoles("HOSPITAL", "RESOURCE_MANAGER"),
    getResources
);

router.get(
    "/medicines/search",
    authorizeRoles("HOSPITAL", "RESOURCE_MANAGER"),
    searchMedicines
);

router.get(
    "/stock-history",
    authorizeRoles("RESOURCE_MANAGER", "HOSPITAL"),
    getStockHistory
);

router.get(
    "/:id",
    authorizeRoles("HOSPITAL", "RESOURCE_MANAGER"),
    getResourceById
);

router.post(
    "/",
    authorizeRoles("RESOURCE_MANAGER"),
    createResource
);

router.put(
    "/:id",
    authorizeRoles("RESOURCE_MANAGER"),
    updateResource
);

router.delete(
    "/:id",
    authorizeRoles("RESOURCE_MANAGER"),
    deleteResource
);

module.exports = router;