
const express = require("express");
const router = express.Router();

const routeController = require("../controllers/routeController");

// Get all published routes
router.get("/", routeController.getRoutes);

// Publish a new route
router.post("/", routeController.createRoute);

module.exports = router;
