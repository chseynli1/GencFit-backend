const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const session = require("express-session");
const passport = require("passport");
require("dotenv").config();

// Google OAuth strategiyan (əgər istifadə edirsənsə)
require("./config/passport");

const app = express();

// ✅ Proxy arxasında düzgün IP/cookie davranışı
app.set("trust proxy", 1);

// ✅ Security middleware (CSP-ni çox sərt etmədən)
app.use(
  helmet({
    // lazım olduqda iframe və s. üçün yumşalt
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// Gzip
app.use(compression());

// Access log
app.use(morgan("combined"));

// ✅ CORS (frontend domenlərini .env-dən)
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim());

app.use(
  cors({
    origin: function (origin, cb) {
      // Postman və server daxili çağırışlar üçün origin yoxdursa icazə verək
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("CORS: origin not allowed: " + origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Preflight
app.options("*", cors());

// ✅ Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ✅ Fayllar
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  maxAge: "1d",
  fallthrough: true,
}));

// ✅ Sessiya (Google OAuth və ya öz sessiyalarınız üçün)
const isProd = process.env.NODE_ENV === "production";
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecretkey",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      // Frontend və backend fərqli domenlərdədirsə:
      sameSite: isProd ? "none" : "lax",
      secure: isProd, // HTTPS olduqda true
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 gün
    },
  })
);

// Passport init (əgər Google OAuth işlədilirsə)
app.use(passport.initialize());
app.use(passport.session());

// 🔒 (İstəyə bağlı) Rate limit yalnız API üçün
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 500,
//   standardHeaders: true,
//   legacyHeaders: false,
// });
// app.use("/api/", limiter);

// ✅ MongoDB
(async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URL, {
      // options (lazım deyilsə boş burax)
    });
    console.log("MongoDB Connected:", conn.connection.host);
  } catch (e) {
    console.error("MongoDB connection error:", e);
    process.exit(1);
  }
})();

// Health
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// ✅ Routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const venueRoutes = require("./routes/venues");
const blogRoutes = require("./routes/blogs");
const partnerRoutes = require("./routes/partners");
const reviewRoutes = require("./routes/reviews");
const contactRoutes = require("./routes/contacts");
const appointmentRoutes = require("./routes/appointments");
const dashboardRoutes = require("./routes/dashboard");
const chatRoutes = require("./routes/chat");

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/venues", venueRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/partners", partnerRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/chat", chatRoutes); // <-- /api/chat hazırdır

// Root info
app.get("/api", (req, res) => {
  res.json({
    message: "Sports & Entertainment Platform API",
    version: "1.0.0",
    documentation: "/api/docs",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      venues: "/api/venues",
      blogs: "/api/blogs",
      partners: "/api/partners",
      reviews: "/api/reviews",
      contacts: "/api/contacts",
      appointments: "/api/appointments",
      dashboard: "/api/dashboard",
      chat: "/api/chat",
    },
  });
});

// 404
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
    path: req.originalUrl,
  });
});

// Error middleware
const errorHandler = require("./middleware/errorHandler");
app.use(errorHandler);

// Graceful shutdown
const closeMongoose = (signal) => {
  console.log(`${signal} received. Shutting down gracefully...`);
  mongoose.connection.close(() => {
    console.log("MongoDB connection closed.");
    process.exit(0);
  });
};
process.on("SIGTERM", () => closeMongoose("SIGTERM"));
process.on("SIGINT", () => closeMongoose("SIGINT"));

// Unhandled rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err?.message);
  process.exit(1);
});

// ✅ Start
const PORT = process.env.PORT || 8001;
const HOST = "0.0.0.0";
const server = app.listen(PORT, HOST, () => {
  console.log(`API running on http://${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API Base URL: http://localhost:${PORT}/api`);
});

module.exports = app;
