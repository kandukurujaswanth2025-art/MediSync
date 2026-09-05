const express = require("express");

const {
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
} = require("../controllers/queueController");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateToken);

router.get(
    "/",
    authorizeRoles("HOSPITAL", "RESOURCE_MANAGER"),
    getQueue
);

router.post(
    "/",
    authorizeRoles("PATIENT", "HOSPITAL"),
    registerVisit
);

router.get(
    "/my",
    authorizeRoles("PATIENT"),
    getMyQueueEntry
);

router.get(
    "/current",
    authorizeRoles("HOSPITAL", "RESOURCE_MANAGER"),
    getCurrentlyServing
);

router.get(
    "/stats",
    authorizeRoles("HOSPITAL", "RESOURCE_MANAGER"),
    getHospitalStats
);
router.get(
    "/history",
    authorizeRoles("PATIENT"),
    getVisitHistory
);
router.get(
    "/:id/position",
    authorizeRoles("PATIENT", "HOSPITAL", "RESOURCE_MANAGER"),
    getQueuePosition
);

router.patch(
    "/:id/call",
    authorizeRoles("HOSPITAL"),
    callPatient
);

router.patch(
    "/:id/start",
    authorizeRoles("HOSPITAL"),
    startConsultation
);

router.patch(
    "/:id/complete",
    authorizeRoles("HOSPITAL"),
    completeConsultation
);

module.exports = router;