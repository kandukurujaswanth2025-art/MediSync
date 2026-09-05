const express = require("express");

const {
    searchMedicines,
    createPrescription,
    getPrescription,
    getMyPrescriptions
} = require("../controllers/medicineController");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateToken);

router.get(
    "/search",
    authorizeRoles("HOSPITAL", "RESOURCE_MANAGER"),
    searchMedicines
);

router.post(
    "/prescriptions",
    authorizeRoles("HOSPITAL"),
    createPrescription
);

router.get(
    "/prescriptions/my",
    authorizeRoles("PATIENT"),
    getMyPrescriptions
);

router.get(
    "/prescriptions/:orderId",
    authorizeRoles(
        "PATIENT",
        "HOSPITAL",
        "RESOURCE_MANAGER"
    ),
    getPrescription
);

module.exports = router;