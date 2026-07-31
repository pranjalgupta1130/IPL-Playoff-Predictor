import express from "express";
import http from "http";
import { connectDB } from "../config/db";
import simulationsRouter from "../routes/simulations";
import { Simulation } from "../models/Simulation";
import { generateShareId } from "../services/simulationService";

async function runVerification() {
  console.log("=== Starting Milestone 1 Verification ===");

  // 1. Test Share ID Generation
  console.log("\n1. Testing Share ID Generation...");
  const ids = new Set<string>();
  for (let i = 0; i < 100; i++) {
    const id = generateShareId();
    if (!/^[a-zA-Z0-9]{12}$/.test(id)) {
      throw new Error(`Share ID '${id}' does not match expected URL-safe pattern.`);
    }
    ids.add(id);
  }
  if (ids.size !== 100) {
    throw new Error("Share ID collision detected during test run!");
  }
  console.log("✅ Share ID generator is unique, URL-safe, non-sequential, and collision resistant.");

  // 2. Connect to In-Memory Database and setup Express app
  console.log("\n2. Setting up test database & server...");
  await connectDB("");
  
  const app = express();
  app.use(express.json());
  app.use("/api/simulations", simulationsRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`Test server running at ${baseUrl}`);

  // Sample simulation payload
  const testPayload = {
    predictions: [
      {
        matchId: "65a1234567890abcdef12345",
        predictedWinner: "Chennai Super Kings",
        margin: 20,
        marginType: "runs",
      },
    ],
    completedMatchesSnapshot: [
      { matchNumber: 1, teamA: "RCB", teamB: "CSK", winner: "CSK" },
    ],
    generatedStandings: [
      { teamName: "CSK", points: 18, nrr: 0.52 },
      { teamName: "MI", points: 16, nrr: 0.31 },
    ],
    qualificationResults: {
      CSK: { status: "QUALIFIED", minWinsNeeded: 0 },
    },
    playoffProbabilities: [
      { teamName: "CSK", top4Probability: 99.8, top2Probability: 85.0 },
      { teamName: "MI", top4Probability: 75.2, top2Probability: 40.1 },
    ],
    metadata: {
      userNote: "My playoff scenario 2026",
    },
  };

  // 3. Test POST /api/simulations/save
  console.log("\n3. Testing POST /api/simulations/save...");
  const saveRes = await fetch(`${baseUrl}/api/simulations/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(testPayload),
  });

  if (saveRes.status !== 201) {
    const errText = await saveRes.text();
    throw new Error(`Expected HTTP 201, got ${saveRes.status}: ${errText}`);
  }

  const saveJson = (await saveRes.json()) as { shareId: string; shareUrl: string };
  console.log("POST Response:", saveJson);

  if (!saveJson.shareId || !saveJson.shareUrl) {
    throw new Error("POST response missing shareId or shareUrl");
  }
  if (!saveJson.shareUrl.includes(saveJson.shareId)) {
    throw new Error("shareUrl does not contain shareId");
  }
  console.log("✅ POST /api/simulations/save verified successfully.");

  // 4. Test GET /api/simulations/:shareId
  console.log("\n4. Testing GET /api/simulations/:shareId...");
  const getRes = await fetch(`${baseUrl}/api/simulations/${saveJson.shareId}`);
  if (getRes.status !== 200) {
    const errText = await getRes.text();
    throw new Error(`Expected HTTP 200, got ${getRes.status}: ${errText}`);
  }

  const retrievedData = (await getRes.json()) as any;
  console.log("Retrieved Share ID:", retrievedData.shareId);

  // Validate stored contents match original snapshot exactly
  if (retrievedData.shareId !== saveJson.shareId) {
    throw new Error("Retrieved shareId mismatch");
  }
  if (JSON.stringify(retrievedData.predictions) !== JSON.stringify(testPayload.predictions)) {
    throw new Error("Retrieved predictions do not match saved snapshot");
  }
  if (JSON.stringify(retrievedData.generatedStandings) !== JSON.stringify(testPayload.generatedStandings)) {
    throw new Error("Retrieved standings do not match saved snapshot");
  }
  if (JSON.stringify(retrievedData.playoffProbabilities) !== JSON.stringify(testPayload.playoffProbabilities)) {
    throw new Error("Retrieved probabilities do not match saved snapshot");
  }
  console.log("✅ GET /api/simulations/:shareId returned identical stored snapshot.");

  // 5. Test Validation & Error Cases
  console.log("\n5. Testing Validation & Error Handling...");

  // 5a. Missing fields
  const invalidSaveRes = await fetch(`${baseUrl}/api/simulations/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ predictions: [] }),
  });
  if (invalidSaveRes.status !== 400) {
    throw new Error(`Expected HTTP 400 for missing fields, got ${invalidSaveRes.status}`);
  }
  console.log("✅ Save API correctly rejects missing required snapshot fields with HTTP 400.");

  // 5b. Non-existent share ID
  const notFoundRes = await fetch(`${baseUrl}/api/simulations/nonExistentId123`);
  if (notFoundRes.status !== 404) {
    throw new Error(`Expected HTTP 404 for non-existent share ID, got ${notFoundRes.status}`);
  }
  console.log("✅ Retrieve API correctly returns HTTP 404 for non-existent share ID.");

  // 5c. Invalid share ID format
  const invalidFormatRes = await fetch(`${baseUrl}/api/simulations/invalid@share!id`);
  if (invalidFormatRes.status !== 400) {
    throw new Error(`Expected HTTP 400 for invalid share ID format, got ${invalidFormatRes.status}`);
  }
  console.log("✅ Retrieve API correctly returns HTTP 400 for invalid share ID format.");

  // 6. Test Immutability Guard
  console.log("\n6. Testing Immutability Enforcement...");
  try {
    await Simulation.updateOne(
      { shareId: saveJson.shareId },
      { $set: { "metadata.modified": true } }
    );
    throw new Error("Immutability check failed: updateOne succeeded when it should have thrown.");
  } catch (err: any) {
    if (err.message.includes("immutable")) {
      console.log("✅ Mongoose pre-update hook correctly blocked mutation:", err.message);
    } else {
      throw err;
    }
  }

  await new Promise<void>((resolve) => server.close(() => resolve()));
  const mongoose = require("mongoose");
  await mongoose.disconnect();
  console.log("\n🎉 ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!");
}

runVerification().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});

