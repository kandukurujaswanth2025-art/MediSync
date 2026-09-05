const express = require("express");

const {
    getRequests,
    createRequest,
    updateRequestStatus,
    deleteRequest
} = require("../controllers/requestController");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateToken);

router.get(
    "/",
    authorizeRoles("HOSPITAL", "RESOURCE_MANAGER"),
    getRequests
);

router.post(
    "/",
    authorizeRoles("HOSPITAL"),
    createRequest
);

router.patch(
    "/:id/status",
    authorizeRoles("HOSPITAL", "RESOURCE_MANAGER"),
    updateRequestStatus
);

router.delete(
    "/:id",
    authorizeRoles("HOSPITAL", "RESOURCE_MANAGER"),
    deleteRequest
);

module.exports = router;