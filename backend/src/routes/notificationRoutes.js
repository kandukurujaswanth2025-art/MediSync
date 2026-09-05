const express = require("express");

const {
    getNotifications,
    markNotificationRead
} = require("../controllers/notificationController");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateToken);

router.get(
    "/",
    authorizeRoles(
        "PATIENT",
        "HOSPITAL",
        "RESOURCE_MANAGER"
    ),
    getNotifications
);

router.patch(
    "/:id/read",
    authorizeRoles(
        "PATIENT",
        "HOSPITAL",
        "RESOURCE_MANAGER"
    ),
    markNotificationRead
);

module.exports = router;