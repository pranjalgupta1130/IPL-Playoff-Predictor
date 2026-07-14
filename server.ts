import dotenv from "dotenv";
import express from "express";
import next from "next";
import cors from "cors";

import { connectDB } from "./backend/src/config/db";

import teamsRouter from "./backend/src/routes/teams";
import matchesRouter from "./backend/src/routes/matches";
import predictionsRouter from "./backend/src/routes/predictions";
import qualificationRouter from "./backend/src/routes/qualification";
import universeRouter from "./backend/src/routes/universe";
import authRouter from "./backend/src/routes/auth";

dotenv.config();

const dev = process.env.NODE_ENV !== "production";

const nextApp = next({
  dev,
  dir: "./frontend",
});

const handle = nextApp.getRequestHandler();

const PORT = Number(process.env.PORT) || 3000;
const MONGODB_URI = process.env.MONGODB_URI || "";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

async function startServer() {
  try {
    // Connect Database
    await connectDB(MONGODB_URI);

    // Create Express App
    const app = express();

    // Middleware
    app.use(
      cors({
        origin: CORS_ORIGIN,
        credentials: true,
      })
    );

    app.use(express.json());

    // Health Check
    app.get("/api/health", (_req, res) => {
      res.json({
        status: "ok",
        service: "ipl-playoff-predictor-api",
      });
    });

    // API Routes
    app.use("/api/auth", authRouter);
    app.use("/api/teams", teamsRouter);
    app.use("/api/matches", matchesRouter);
    app.use("/api/predictions", predictionsRouter);
    app.use("/api/qualification", qualificationRouter);
    app.use("/api/universe", universeRouter);

    // Prepare Next.js
    console.log("Preparing Next.js...");
    await nextApp.prepare();
    console.log("Next.js Ready.");

    // Serve Frontend
    app.all("*", (req, res) => {
      return handle(req, res);
    });

    // Start Server
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();