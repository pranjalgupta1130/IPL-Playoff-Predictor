import dotenv from "dotenv";
import { connectDB } from "../config/db";
import { Team } from "../models/Team";
import { Match } from "../models/Match";
import { Prediction } from "../models/Prediction";
import { syncFixturesToMongo } from "../services/cricketData";

dotenv.config();

async function seed() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ipl-predictor";
  await connectDB(uri);

  await Promise.all([
    Team.deleteMany({}),
    Match.deleteMany({}),
    Prediction.deleteMany({}),
  ]);

  console.log("Running cricketData sync (using static ipl-2026.json dataset)...");

  const beforeCount = await Match.countDocuments({});
  await syncFixturesToMongo();
  const afterCount = await Match.countDocuments({});
  const inserted = Math.max(0, afterCount - beforeCount);

  console.log("Fetched/normalized fixtures into Mongo:", { beforeCount, afterCount, inserted });

  console.log("Database seeded successfully");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
