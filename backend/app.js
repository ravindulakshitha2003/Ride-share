
const express = require("express");
const cors = require("cors");

const routeRoutes = require("./routes/routeRoutes");
const locationRoutes = require("./routes/locationRoutes");
const rideRoutes = require("./routes/rideRoutes");
const geocodeRoutes = require("./routes/geocodeRoutes");
const {
  notFound,
  errorHandler,
} = require("./middleware/errorHandler");

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"],
  })
);

app.use(express.json({ limit: "1mb" }));

// Temporary request logging for debugging
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

app.get("/", (req, res) => {
  res.json({
    message: "Live GPS and Ride Booking API is running",
  });
});

app.use("/routes", routeRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/rides", rideRoutes);
app.use("/api/geocode", geocodeRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
