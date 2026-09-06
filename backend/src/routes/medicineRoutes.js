const express = require("express");

const {
    searchMedicines,
    createPrescription,
    getPrescription,
    getMyPrescriptions,
    deletePrescription
} = require("../controllers/medicineController");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

const router =
    express.Router();

router.use(
    authenticateToken
);

// ============================================================
// MEDICINE SEARCH
// ============================================================

router.get(
    "/search",
    authorizeRoles(
        "HOSPITAL",
        "RESOURCE_MANAGER"
    ),
    searchMedicines
);

// ============================================================
// CREATE PRESCRIPTION
// ============================================================

router.post(
    "/prescriptions",
    authorizeRoles(
        "HOSPITAL"
    ),
    createPrescription
);

// ============================================================
// PATIENT PRESCRIPTIONS
// ============================================================

router.get(
    "/prescriptions/my",
    authorizeRoles(
        "PATIENT"
    ),
    getMyPrescriptions
);

// ============================================================
// SINGLE PRESCRIPTION
// ============================================================

router.get(
    "/prescriptions/:orderId",
    authorizeRoles(
        "PATIENT",
        "HOSPITAL",
        "RESOURCE_MANAGER"
    ),
    getPrescription
);

// ============================================================
// DELETE PRESCRIPTION
// Only the patient who owns the prescription
// can delete it.
// ============================================================

router.delete(
    "/prescriptions/:orderId",
    authorizeRoles(
        "PATIENT"
    ),
    deletePrescription
);

module.exports =
    router;