
const express = require("express");

const {
    hospitalLogin,
    managerLogin,
    patientLogin,
    patientRegister,
    verifyManagerMfa,
    enrollManagerMfa,
    enableManagerMfa,
    sendResetOtp,
    verifyResetOtp,
    resetPassword
} = require("../controllers/authController");

const router = express.Router();

router.post("/hospital/login", hospitalLogin);
router.post("/manager/login", managerLogin);
router.post("/manager/verify-mfa", verifyManagerMfa);
router.post("/patient/login", patientLogin);
router.post("/patient/register", patientRegister);

router.post("/password-reset/request", sendResetOtp);
router.post("/password-reset/verify", verifyResetOtp);
router.post("/password-reset/reset", resetPassword);
router.post("/manager/mfa/enroll", enrollManagerMfa);
router.post("/manager/mfa/enable", enableManagerMfa);


module.exports = router;
