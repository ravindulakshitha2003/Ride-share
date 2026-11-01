
require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");

const app = require("./app");
const connectDB = require("./config/db");
const { configureRedisAdapter } = require("./config/redis");
const { registerSocketHandlers } = require("./sockets/socketHandlers");

const server = http.createServer(app);

const allowedOrigin =
    process.env.FRONTEND_ORIGIN || "http://localhost:5173";

const io = new Server(server, {
    cors: {
        origin: allowedOrigin,
        methods: ["GET", "POST"]
    }
});

registerSocketHandlers(io);

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
    // Connect to MongoDB first
    await connectDB();

    // Preserve the existing Redis adapter
    await configureRedisAdapter(io);

    // Start the HTTP and Socket.IO server
    // server.listen(PORT, () => {
    //     console.log(`Backend running at http://localhost:${PORT}`);
    // });
    server.listen(PORT, "0.0.0.0", () => {
        console.log(`Backend running at http://localhost:${PORT}`);
    });
}

startServer().catch((error) => {
    console.error("Failed to start backend:", error.message);
    process.exit(1);
});
