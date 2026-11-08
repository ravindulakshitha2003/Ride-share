
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

// Validate OSRM GeoJSON route coordinates
function validRouteGeometry(geometry) {
    if (
        !geometry ||
        geometry.type !== "LineString" ||
        !Array.isArray(geometry.coordinates) ||
        geometry.coordinates.length < 2
    ) {
        return false;
    }

    return geometry.coordinates.every(point =>
        Array.isArray(point) &&
        point.length === 2 &&
        Number.isFinite(point[0]) &&
        Number.isFinite(point[1]) &&
        Math.abs(point[0]) <= 180 &&
        Math.abs(point[1]) <= 90
    );
}

// Get all published routes
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
            routeGeometry,
            departureDate,
            departureTime,
            availableSeats,
            pricePerSeat,
            driverId
        } = req.body || {};

        // Validate origin and destination
        if (!validLocation(origin) || !validLocation(destination)) {
            return res.status(400).json({
                message: "Select valid origin and destination locations."
            });
        }

        // Check same location
        if (
            origin.latitude === destination.latitude &&
            origin.longitude === destination.longitude
        ) {
            return res.status(400).json({
                message: "Origin and destination must be different."
            });
        }

        // Validate complete route geometry
        if (!validRouteGeometry(routeGeometry)) {
            return res.status(400).json({
                message: "Provide valid OSRM route geometry with at least two coordinates."
            });
        }

        // Validate date and time
        if (
            typeof departureDate !== "string" ||
            typeof departureTime !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(departureDate) ||
            !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(departureTime)
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

        // Validate seats
        if (
            !Number.isInteger(availableSeats) ||
            availableSeats < 1 ||
            availableSeats > 8
        ) {
            return res.status(400).json({
                message: "Available seats must be between 1 and 8."
            });
        }

        // Validate price
        if (
            typeof pricePerSeat !== "number" ||
            !Number.isFinite(pricePerSeat) ||
            pricePerSeat <= 0
        ) {
            return res.status(400).json({
                message: "Price per seat must be greater than zero."
            });
        }

        // Create route in MongoDB
        const route = await Route.create({
            origin,
            destination,
            routeGeometry,
            departureDate,
            departureTime,
            availableSeats,
            pricePerSeat,
            driverId
        });

        console.log("Route published:", route.id);
        console.log(
            "Route coordinate count:",
            routeGeometry.coordinates.length
        );

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
