import { connectDB } from "../config/db";
import { Match } from "../models/Match";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ipl-predictor";

async function main() {
  await connectDB(uri);

  const total = await Match.countDocuments({});

  const stageLeague = await Match.countDocuments({ stage: "league" });
  const playoffStages = await Match.countDocuments({ stage: { $in: ["qualifier1", "qualifier2", "eliminator", "final"] } });

  // Validate matchNumber range 1..70 and uniqueness.
  const leagueWithNumbers = await Match.find({ stage: "league", matchNumber: { $gte: 1, $lte: 70 } })
    .select({ matchNumber: 1, fixtureId: 1 })
    .lean();

  const matchNumbers = leagueWithNumbers.map((m: any) => m.matchNumber).filter((x: any) => x != null);
  const uniqueMatchNumbers = new Set(matchNumbers);

  const missing = [] as number[];
  for (let i = 1; i <= 70; i++) {
    if (!uniqueMatchNumbers.has(i)) missing.push(i);
  }

  // Count any duplicates by matchNumber
  const countsByNumber = new Map<number, number>();
  for (const n of matchNumbers) countsByNumber.set(n, (countsByNumber.get(n) ?? 0) + 1);
  const duplicates: Array<{ matchNumber: number; count: number }> = [];
  for (const [k, v] of countsByNumber.entries()) {
    if (v > 1) duplicates.push({ matchNumber: k, count: v });
  }
  duplicates.sort((a, b) => a.matchNumber - b.matchNumber);

  // Basic sanity about fixtureId presence.
  const missingFixtureId = await Match.countDocuments({ stage: "league", $or: [{ fixtureId: { $exists: false } }, { fixtureId: null }, { fixtureId: "" }] });

  console.log("verifyMongoMatchMetadata:", {
    totalFixtures: total,
    stageCounts: { league: stageLeague, playoffs: playoffStages },
    leagueMatchNumberCount: leagueWithNumbers.length,
    leagueMatchNumbersUniqueCount: uniqueMatchNumbers.size,
    missingLeagueMatchNumbers: missing,
    duplicateLeagueMatchNumbers: duplicates.slice(0, 20),
    leagueMissingFixtureIdCount: missingFixtureId,
  });

  await (await import("mongoose")).disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

