
const express = require("express");
const router = express.Router();

const rideController = require("../controllers/rideController");

router.get("/", rideController.getRides);

module.exports = router;
