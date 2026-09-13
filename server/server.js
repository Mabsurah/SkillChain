const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const { connectDatabase, getDatabaseStatus } = require("./config/database");
const apiRoutes = require("./routes/api");

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads", "certificates");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Enable CORS for frontend Vite client
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve static uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

// Root API Endpoint
app.get("/", (req, res) => {
  res.json({
    message: "SkillChain Oracle DB Backend API is Running",
    status: "online",
    endpoints: {
      health: "/api/health",
      courses: "/api/courses",
      skills: "/api/skills",
      certificates: "/api/certificates",
      participants: "/api/participants",
      reports: "/api/reports",
      monitor: "/api/monitor",
      notifications: "/api/notifications",
      queries: {
        function: "/api/queries/run-function",
        subquery: "/api/queries/run-subquery",
        view: "/api/queries/run-view",
        adt: "/api/queries/run-adt",
        plsql: "/api/queries/run-plsql",
        cursor: "/api/queries/run-cursor",
        exception: "/api/queries/run-exception"
      }
    }
  });
});

// Mount Main API Router
app.use("/api", apiRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("[Server Error]:", err);
  res.status(500).json({
    error: true,
    message: err.message || "Internal Server Error"
  });
});

async function startServer() {
  try {
    // Attempt Oracle Database Connection Pool
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(` SkillChain Backend Server Running on http://localhost:${PORT}`);
      console.log(` Database Target: ${process.env.DB_CONNECT_STRING || "localhost:1521/XE"}`);
      console.log(` Ready to process Oracle SQL & PL/SQL queries from frontend!`);
      console.log(`=======================================================`);
    });
  } catch (error) {
    console.error("Critical error starting SkillChain server:", error);
  }
}

startServer();