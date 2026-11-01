
const Location = require("../models/locationModel");

// Get all latest locations
function getLocations(req, res) {
    return res.json(Location.getAll());
}

module.exports = {
    getLocations
};
