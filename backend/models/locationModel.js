const locations = new Map();
function getAll() { return [...locations.values()]; }
function upsert(location) { locations.set(location.id, location); return location; }
function remove(id) { return locations.delete(id); }
module.exports = { getAll, upsert, remove };
