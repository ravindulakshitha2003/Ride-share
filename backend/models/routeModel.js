
const mongoose = require("mongoose");

// Schema for origin and destination
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

// MongoDB schema for a published route
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

// Keep a string ID for compatibility with the existing controller
routeSchema.virtual("id").get(function () {
    return this._id.toString();
});

const RouteDocument = mongoose.model("Route", routeSchema);

// Keep the existing model interface
async function getAll() {
    return RouteDocument.find().sort({ createdAt: -1 });
}

async function getById(id) {
    if (!mongoose.isValidObjectId(id)) {
        return null;
    }

    return RouteDocument.findById(id);
}

async function create(data) {
    return RouteDocument.create({
        origin: {
            placeName: data.origin.placeName,
            latitude: data.origin.latitude,
            longitude: data.origin.longitude
        },
        destination: {
            placeName: data.destination.placeName,
            latitude: data.destination.latitude,
            longitude: data.destination.longitude
        },
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
