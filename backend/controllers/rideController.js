
const Ride = require("../models/rideModel");

// Get all rides
function getRides(req, res) {
    return res.json(Ride.getAll());
}

module.exports = {
    getRides
};
