import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongod: MongoMemoryServer | null = null;

export async function connectDB(uri: string): Promise<void> {
  try {
    const isLocalhost = uri.includes("localhost") || uri.includes("127.0.0.1");
    if (!uri || isLocalhost) {
      console.log(`Using in-memory MongoDB server (provided URI is empty or points to localhost: ${uri})...`);
      mongod = await MongoMemoryServer.create();
      uri = mongod.getUri();
      console.log("In-memory MongoDB started at URI:", uri);
    }
    
    // Set buffering to false so it fails fast instead of hanging if offline
    mongoose.set("bufferCommands", false);

    await mongoose.connect(uri);
    console.log("MongoDB connected");

    // Seed the database if empty
    const { Team } = require("../models/Team");
    const { Match } = require("../models/Match");
    const { Prediction } = require("../models/Prediction");
    
    const teamCount = await Team.countDocuments({});
    const firstMatch = await Match.findOne({ matchNumber: 1 });

    if (teamCount !== 10 || !firstMatch || firstMatch.fixtureId !== "IPL2026-001") {
      console.log("Database contains stale or invalid IPL 2026 data. Reseeding with new JSON...");
      
      const { SEED_TEAMS, SEED_MATCHES } = require("../data/seedData");

      await Promise.all([
        Team.deleteMany({}),
        Match.deleteMany({}),
        Prediction.deleteMany({}),
      ]);

      await Team.insertMany(SEED_TEAMS);
      await Match.insertMany(SEED_MATCHES);

      const updatedTeamCount = await Team.countDocuments({});
      const updatedMatchCount = await Match.countDocuments({});
      console.log(`Database seeded successfully! Teams: ${updatedTeamCount}, Matches: ${updatedMatchCount}`);
    } else {
      console.log(`Database already has correct data. Teams: ${teamCount}, Matches: 70`);
    }
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}

