
const mongoose = require("mongoose");

// Origin and destination schema
const locationSchema = new mongoose.Schema(
    {
        placeName: {
            type: String,
            required: true,
            trim: true
        },
        latitude: {
            type: Number,
            required: true,
            min: -90,
            max: 90
        },
        longitude: {
            type: Number,
            required: true,
            min: -180,
            max: 180
        }
    },
    { _id: false }
);

// Complete road route geometry (GeoJSON)
const routeGeometrySchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ["LineString"],
            required: true,
            default: "LineString"
        },
        coordinates: {
            type: [[Number]],
            required: true
        }
    },
    { _id: false }
);

// Published route schema
const routeSchema = new mongoose.Schema(
    {
        origin: {
            type: locationSchema,
            required: true
        },
        destination: {
            type: locationSchema,
            required: true
        },
        routeGeometry: {
            type: routeGeometrySchema,
            required: true
        },
        departureDate: {
            type: String,
            required: true
        },
        departureTime: {
            type: String,
            required: true
        },
        availableSeats: {
            type: Number,
            required: true,
            min: 1,
            max: 8
        },
        pricePerSeat: {
            type: Number,
            required: true,
            min: 0,
            validate: {
                validator: value => value > 0,
                message: "Price per seat must be greater than zero."
            }
        },
        driverId: {
            type: String,
            trim: true,
            default: null
        },
        status: {
            type: String,
            enum: ["upcoming", "completed", "cancelled"],
            default: "upcoming"
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Geospatial index for passenger route matching
routeSchema.index({ routeGeometry: "2dsphere" });

// Keep string ID compatibility
routeSchema.virtual("id").get(function () {
    return this._id.toString();
});

const RouteDocument = mongoose.model("Route", routeSchema);

// Get all routes
async function getAll() {
    return RouteDocument.find().sort({ createdAt: -1 });
}

// Get route by ID
async function getById(id) {
    if (!mongoose.isValidObjectId(id)) {
        return null;
    }

    return RouteDocument.findById(id);
}

// Create route
async function create(data) {
    return RouteDocument.create({
        origin: data.origin,
        destination: data.destination,
        routeGeometry: data.routeGeometry,
        departureDate: data.departureDate,
        departureTime: data.departureTime,
        availableSeats: data.availableSeats,
        pricePerSeat: data.pricePerSeat,
        driverId: data.driverId || null
    });
}

module.exports = {
    getAll,
    getById,
    create
};
