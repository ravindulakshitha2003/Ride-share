const Location = require("../models/locationModel");
const Ride = require("../models/rideModel");
const roles = new Map();
function validPoint(p) {
  return p && Number.isFinite(p.latitude) && Number.isFinite(p.longitude) &&
    Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180;
}
function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log("Connected:", socket.id);
    roles.set(socket.id, null);
    socket.emit("locations:initial", Location.getAll());
    socket.emit("rides:initial", Ride.getAll());

    socket.on("role:set", (role) => {
      if (role !== "passenger" && role !== "driver") return;
      roles.set(socket.id, role);
      console.log(`${role} connected:`, socket.id);
    });

    socket.on("location:update", (data) => {
      if (!validPoint(data)) return;
      const location = {
        id: socket.id, latitude: data.latitude, longitude: data.longitude,
        accuracy: Number.isFinite(data.accuracy) ? data.accuracy : null,
        updatedAt: new Date().toISOString()
      };
      Location.upsert(location);
      io.emit("location:update", location);
    });

    socket.on("ride:create", (data, callback) => {
      const reply = typeof callback === "function" ? callback : () => {};
      if (roles.get(socket.id) !== "passenger")
        return reply({ ok: false, message: "Send the request from passenger mode." });
      if (!validPoint(data?.pickup) || !validPoint(data?.destination))
        return reply({ ok: false, message: "Select valid pickup and destination locations." });
      const ride = Ride.create({
        passengerSocketId: socket.id, pickup: data.pickup,
        destination: data.destination, distanceKm: data.distanceKm
      });
      io.emit("ride:created", ride);
      reply({ ok: true, ride });
      console.log("Ride requested:", ride.id);
    });

    socket.on("ride:accept", (rideId, callback) => {
      const reply = typeof callback === "function" ? callback : () => {};
      if (roles.get(socket.id) !== "driver")
        return reply({ ok: false, message: "Accept the ride from driver mode." });
      const ride = Ride.getById(rideId);
      if (!ride) return reply({ ok: false, message: "Ride not found." });
      if (ride.status !== "requested")
        return reply({ ok: false, message: "This ride has already been accepted." });
      ride.driverSocketId = socket.id;
      ride.status = "accepted";
      ride.acceptedAt = new Date().toISOString();
      Ride.update(ride);
      io.emit("ride:updated", ride);
      reply({ ok: true, ride });
      console.log("Ride accepted:", ride.id);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected:", socket.id);
      Location.remove(socket.id);
      roles.delete(socket.id);
    });
  });
}
module.exports = { registerSocketHandlers };
