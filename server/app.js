const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
// custom sanitizer handles read-only req.query issue
const mongoSanitize = require("express-mongo-sanitize");
const sanitize = require("./middleware/sanitize");
const hpp = require("hpp");
const rateLimit = require("express-rate-limit");
const errorHandler = require("./middleware/errorHandler");

// .env is loaded in server.js with path to server/.env so it works from any cwd
const app = express();

// ─── Security Middleware ───────────────────────────────
app.use(helmet());                          // Set secure HTTP headers
// use our wrapper to avoid "Cannot set property query" errors
app.use(sanitize());                        // Prevent NoSQL injection
app.use(hpp());                             // Prevent HTTP param pollution

// ─── Rate Limiting (global) ────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,                // 15 minutes
  max: 100,                                 // 100 requests per window
  message: { success: false, message: "Too many requests. Please try again later." },
});
app.use("/api", globalLimiter);

// ─── Core Middleware ───────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,                        // Allow cookies
}));

// Stripe webhook must receive raw body for signature verification
const { handleWebhook } = require("./controllers/subscription.controller");
app.post("/api/subscription/webhook", express.raw({ type: "application/json" }), handleWebhook);

app.use(express.json({ limit: "10kb" }));   // Parse JSON, limit body size
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Logger (dev only) ────────────────────────────────
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ─── Health Check ─────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, message: "FinPilot API is running ✅" });
});

// ─── Routes (will be added week by week) ──────────────
app.use("/api/auth",         require("./routes/auth.routes"));
app.use("/api/dashboard",    require("./routes/dashboard.routes"));
app.use("/api/transactions", require("./routes/transaction.routes"));
app.use("/api/goals",        require("./routes/goal.routes"));
app.use("/api/ai",           require("./routes/ai.routes"));
app.use("/api/subscription", require("./routes/subscription.routes"));

// ─── 404 Handler ──────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ─── Global Error Handler ─────────────────────────────
app.use(errorHandler);

module.exports = app;