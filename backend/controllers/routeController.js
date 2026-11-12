
const Route = require("../models/routeModel");

function validLocation(p) {
    return (
        p &&
        typeof p.placeName === "string" &&
        p.placeName.trim() &&
        Number.isFinite(p.latitude) &&
        Number.isFinite(p.longitude) &&
        Math.abs(p.latitude) <= 90 &&
        Math.abs(p.longitude) <= 180
    );
}

// Get all published routes from MongoDB
async function getRoutes(req, res, next) {
    try {
        const routes = await Route.getAll();
        return res.json(routes);
    } catch (error) {
        return next(error);
    }
}

// Publish a new route
async function createRoute(req, res, next) {
    try {
        const {
            origin,
            destination,
            departureDate,
            departureTime,
            availableSeats,
            pricePerSeat
        } = req.body || {};

        if (!validLocation(origin) || !validLocation(destination)) {
            return res.status(400).json({
                message: "Select valid origin and destination locations."
            });
        }

        if (
            origin.latitude === destination.latitude &&
            origin.longitude === destination.longitude
        ) {
            return res.status(400).json({
                message: "Origin and destination must be different."
            });
        }

        if (
            typeof departureDate !== "string" ||
            typeof departureTime !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(departureDate) ||
            !/^\d{2}:\d{2}$/.test(departureTime)
        ) {
            return res.status(400).json({
                message: "Provide a valid departure date and time."
            });
        }

        const departure = new Date(
            `${departureDate}T${departureTime}:00`
        );

        const validDate =
            !Number.isNaN(departure.getTime()) &&
            departure.getFullYear() === Number(departureDate.slice(0, 4)) &&
            departure.getMonth() + 1 === Number(departureDate.slice(5, 7)) &&
            departure.getDate() === Number(departureDate.slice(8, 10)) &&
            departure.getHours() === Number(departureTime.slice(0, 2)) &&
            departure.getMinutes() === Number(departureTime.slice(3, 5));

        if (!validDate || departure <= new Date()) {
            return res.status(400).json({
                message: "Departure date and time must be valid and in the future."
            });
        }

        if (
            !Number.isInteger(availableSeats) ||
            availableSeats < 1 ||
            availableSeats > 8
        ) {
            return res.status(400).json({
                message: "Available seats must be between 1 and 8."
            });
        }

        if (
            typeof pricePerSeat !== "number" ||
            !Number.isFinite(pricePerSeat) ||
            pricePerSeat <= 0
        ) {
            return res.status(400).json({
                message: "Price per seat must be greater than zero."
            });
        }

        const route = await Route.create({
            origin,
            destination,
            departureDate,
            departureTime,
            availableSeats,
            pricePerSeat
        });

        console.log("Route published:", route.id);

        return res.status(201).json({
            message: "Route published successfully.",
            route
        });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    getRoutes,
    createRoute
};
