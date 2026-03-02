import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/authRoutes.js";
import bookRoutes from "./routes/bookRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve static files from the 'uploads' directory
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Request logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI is MISSING in environment variables!");
} else {
  console.log(`📡 Attempting to connect to MongoDB... (URI length: ${MONGO_URI.length})`);
  // Log a masked version of the URI for debugging
  const maskedUri = MONGO_URI.replace(/:([^@]+)@/, ":****@");
  console.log(`🔗 Target: ${maskedUri}`);
}

mongoose.connection.on("connected", () => console.log("✅ Mongoose connected to DB"));
mongoose.connection.on("error", (err) => console.error("❌ Mongoose connection error:", err));
mongoose.connection.on("disconnected", () => console.log("ℹ️ Mongoose disconnected"));

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState >= 1) return;
    await mongoose.connect(MONGO_URI || "mongodb://localhost:27017/bookswap", {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });
  } catch (err) {
    console.error("❌ Initial MongoDB Connection Error:", err);
  }
};

// Call connection
connectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/", (req, res) => {
  res.send("Book Swap Backend is running! 🚀");
});

// Conditionally listen only if not in production environment (like Vercel)
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export the app for Vercel
export default app;
