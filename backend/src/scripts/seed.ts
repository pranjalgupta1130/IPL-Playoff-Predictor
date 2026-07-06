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

  console.log("Running cricketData sync (provider agnostic)...");
  // tsx can sometimes swallow/ignore env vars when launched from certain terminals.
  // Provide a predictable behavior by trusting dotenv + process.env at runtime.
  console.log("CRICKET_DATA_PROVIDER:", JSON.stringify(process.env.CRICKET_DATA_PROVIDER || ""));
  console.log("SPORTMONKS_API_KEY present:", !!process.env.SPORTMONKS_API_KEY);


  const beforeCount = await Match.countDocuments({});
  await syncFixturesToMongo();
  const afterCount = await Match.countDocuments({});
  const inserted = Math.max(0, afterCount - beforeCount);

  console.log("Fetched/normalized fixtures into Mongo:", { beforeCount, afterCount, inserted });


  // If Sportmonks is unavailable, seed.ts should still populate fixtures so app works in dev.
  // For static provider runs we should not rely on synthetic fallback fixtures.
  if (!process.env.SPORTMONKS_API_KEY && process.env.CRICKET_DATA_PROVIDER !== "static") {


    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { SEED_MATCHES, SEED_TEAMS } = require("../data/seedData");
    // Ensure we insert only if sync didn't already upsert teams/matches.
    const teamCount = await Team.countDocuments({});
    const matchCount = await Match.countDocuments({});
    if (teamCount === 0) {
      await Team.insertMany(SEED_TEAMS);
    }
    if (matchCount === 0) {
      await Match.insertMany(SEED_MATCHES);
    }
    const devCount = await Match.countDocuments({});
    console.log("Dev fallback ensured synthetic fixtures:", { fixtures: devCount });
  }

  console.log("Database seeded successfully");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
