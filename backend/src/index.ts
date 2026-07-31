import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db";
import teamsRouter from "./routes/teams";
import matchesRouter from "./routes/matches";
import predictionsRouter from "./routes/predictions";
import qualificationRouter from "./routes/qualification";
import universeRouter from "./routes/universe";
import authRouter from "./routes/auth";
import simulationsRouter from "./routes/simulations";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ipl-predictor";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "ipl-playoff-predictor-api" });
});

app.use("/api/teams", teamsRouter);
app.use("/api/matches", matchesRouter);
app.use("/api/predictions", predictionsRouter);
app.use("/api/qualification", qualificationRouter);
app.use("/api/universe", universeRouter);
app.use("/api/auth", authRouter);
app.use("/api/simulations", simulationsRouter);



async function start() {
  await connectDB(MONGODB_URI);
  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
