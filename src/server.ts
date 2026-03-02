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

// Middleware to ensure DB is connected
app.use(async (req, res, next) => {
  try {
    if (mongoose.connection.readyState === 0) {
      console.log("🔄 Re-connecting to MongoDB...");
      await connectDB();
    }
    next();
  } catch (err) {
    next(err);
  }
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/", (req, res) => {
  const states = ["Disconnected", "Connected", "Connecting", "Disconnecting"];
  const readyState = mongoose.connection.readyState;
  const status = states[readyState] || "Unknown";
  const icon = readyState === 1 ? "✅" : "❌";
  
  const uriExists = !!process.env.MONGO_URI;
  const uriLength = process.env.MONGO_URI ? process.env.MONGO_URI.length : 0;

  res.send(`
    <div style="font-family: sans-serif; padding: 20px; line-height: 1.6;">
      <h1 style="color: #2563eb;">Book Swap Backend is running! 🚀</h1>
      <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
        <p>Database Status: <strong>${status} ${icon}</strong> (Code: ${readyState})</p>
        <p>Environment: <strong>${process.env.NODE_ENV}</strong></p>
        <hr style="border: 0; border-top: 1px solid #d1d5db; margin: 15px 0;">
        <p>MONGO_URI Detected: <strong>${uriExists ? "Yes (Safe Check)" : "No ⚠️"}</strong></p>
        <p>MONGO_URI Length: <strong>${uriLength} characters</strong></p>
      </div>
      <p style="margin-top: 20px; color: #6b7280; font-size: 0.9em;">
        Try <a href="/api/books">/api/books</a> to test data fetching.
      </p>
    </div>
  `);
});

// Conditionally listen only if not in production environment (like Vercel)
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export the app for Vercel
export default app;
