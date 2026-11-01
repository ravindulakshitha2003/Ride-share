const { createClient } = require("redis");
const { createAdapter } = require("@socket.io/redis-adapter");

async function configureRedisAdapter(io) {
  const pubClient = createClient({ url: process.env.REDIS_URL || "redis://localhost:6379" });
  const subClient = pubClient.duplicate();
  pubClient.on("error", (e) => console.error("Redis publisher error:", e.message));
  subClient.on("error", (e) => console.error("Redis subscriber error:", e.message));
  await Promise.all([pubClient.connect(), subClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));
  console.log("Socket.IO Redis adapter connected");
  return { pubClient, subClient };
}
module.exports = { configureRedisAdapter };
