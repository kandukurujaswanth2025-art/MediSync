const express = require("express");

const {
    getHospitals,
    getHospitalById
} = require("../controllers/hospitalController");

const router = express.Router();

router.get("/", getHospitals);
router.get("/:id", getHospitalById);

module.exports = router;