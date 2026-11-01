const rides = new Map();
let nextId = 1;
function getAll() { return [...rides.values()]; }
function getById(id) { return rides.get(String(id)) || null; }
function create(data) {
  const ride = {
    id: String(nextId++), passengerSocketId: data.passengerSocketId,
    driverSocketId: null, pickup: data.pickup, destination: data.destination,
    distanceKm: Number.isFinite(data.distanceKm) && data.distanceKm >= 0 ? data.distanceKm : null,
    status: "requested", createdAt: new Date().toISOString()
  };
  rides.set(ride.id, ride);
  return ride;
}
function update(ride) { rides.set(String(ride.id), ride); return ride; }
module.exports = { getAll, getById, create, update };
