
const mongoose = require("mongoose");

async function connectDB() {
    try {
        const connection = await mongoose.connect(
            process.env.MONGODB_URI ||
            "mongodb://127.0.0.1:27017/routemate"
        );

        console.log(
            `MongoDB connected: ${connection.connection.host}`
        );
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        throw error;
    }
}

module.exports = connectDB;
