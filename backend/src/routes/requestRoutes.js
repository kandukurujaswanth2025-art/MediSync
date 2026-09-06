const express = require("express");

const {
    getRequests,
    createRequest,
    updateRequestStatus,
    fulfillRequest,
    deleteRequest
} = require("../controllers/requestController");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateToken);

// --------------------------------------------------
// GET REQUESTS
// --------------------------------------------------

router.get(
    "/",
    authorizeRoles("HOSPITAL", "RESOURCE_MANAGER"),
    getRequests
);

// --------------------------------------------------
// CREATE REQUEST
// Hospital creates a resource request.
// --------------------------------------------------

router.post(
    "/",
    authorizeRoles("HOSPITAL"),
    createRequest
);

// --------------------------------------------------
// NORMAL STATUS UPDATE
//
// Valid statuses:
// PENDING
// COMPLETED
//
// Actual completion should normally happen
// through the fulfill endpoint below.
// --------------------------------------------------

router.patch(
    "/:id/status",
    authorizeRoles(
        "HOSPITAL",
        "RESOURCE_MANAGER"
    ),
    updateRequestStatus
);

// --------------------------------------------------
// FULFILL REQUEST
//
// Resource Manager enters the actual received
// quantity.
//
// Backend will:
// - find the existing medicine and increase stock
// - OR create a new medicine if it doesn't exist
// - record stock history
// - change PENDING -> COMPLETED
// --------------------------------------------------

router.patch(
    "/:id/fulfill",
    authorizeRoles("RESOURCE_MANAGER"),
    fulfillRequest
);

// --------------------------------------------------
// DELETE REQUEST
//
// Both Hospital and Resource Manager can delete
// requests.
// --------------------------------------------------

router.delete(
    "/:id",
    authorizeRoles(
        "HOSPITAL",
        "RESOURCE_MANAGER"
    ),
    deleteRequest
);

module.exports = router;