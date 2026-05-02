const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize");
const sanitize = require("./middleware/sanitize");
const hpp = require("hpp");
const rateLimit = require("express-rate-limit");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// ─── CORS ──────────────────────────────────────────────
app.use(cors({
  origin: true,
  credentials: true
}));

// ─── FIX #1: Trust proxy MUST come first, before rate limiter ─────────────────
// Without this, express-rate-limit can't read X-Forwarded-For correctly and
// throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR, causing slow fallback on every req.
// '1' = trust the first proxy hop (nginx, Railway, Render, Heroku, etc.)
app.set("trust proxy", 1);

// ─── Security Middleware ───────────────────────────────
app.use(helmet());
app.use(sanitize());  // sanitize.js is a factory — call it to get the middleware
app.use(hpp());

// ─── Rate Limiting ─────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 900,
  standardHeaders: true,   // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,     // Disable X-RateLimit-* headers (deprecated)
  message: { success: false, message: "Too many requests. Please try again later." },
  // FIX #2: explicitly tell the limiter we've handled the proxy trust above
  // This suppresses the warning and uses the correct IP from X-Forwarded-For
  validate: { trustProxy: false },
});
app.use("/api", globalLimiter);

// ─── Stricter limiter for auth routes only ─────────────
// Login/register are the most abused endpoints — tighten them separately
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 attempts per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Please try again in 15 minutes." },
  validate: { trustProxy: false },
});

// ─── Stripe Webhook (must be before body parsers) ──────
const { handleWebhook } = require("./controllers/subscription.controller");
app.post("/api/subscription/webhook", express.raw({ type: "application/json" }), handleWebhook);

// ─── Core Middleware ───────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Logger ────────────────────────────────────────────
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ─── Health Check ──────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, message: "FinPilot API is running ✅" });
});

// ─── Routes ────────────────────────────────────────────
// Apply stricter auth limiter to login/register only


app.use("/api/auth",       require("./routes/auth.routes"));
app.use("/api/chat", require('./routes/chatroutes'));
app.use("/api/dashboard",    require("./routes/dashboard.routes"));
app.use("/api/transactions", require("./routes/transaction.routes"));
app.use("/api/transaction-categories", require("./routes/transactionCategory.routes"));
app.use("/api/goals",        require("./routes/goal.routes"));
app.use("/api/ai",           require("./routes/ai.routes"));
app.use("/api/subscription", require("./routes/subscription.routes"));
app.use("/api/crypto",       require("./routes/crypto.routes"));

// ─── 404 Handler ───────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ─── Global Error Handler ──────────────────────────────
app.use(errorHandler);

module.exports = app;
