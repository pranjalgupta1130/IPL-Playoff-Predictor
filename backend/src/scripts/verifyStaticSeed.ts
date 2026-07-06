import { connectDB } from "../config/db";
import { Match } from "../models/Match";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ipl-predictor";

function isValid2026(d: Date): boolean {
  return d instanceof Date && !Number.isNaN(d.getTime()) && d.getUTCFullYear() === 2026;
}

async function main() {
  await connectDB(uri);

  const total = await Match.countDocuments({});
  const sample = await Match.find({}).sort({ date: 1 }).limit(5).lean();

  const zeroDates = await Match.countDocuments({ date: { $gte: new Date("1970-01-02"), $lt: new Date("1971-01-01") } });

  const leagueWithMatchNumber = await Match.countDocuments({});
  // Match schema does not store matchNumber/stage yet; this script validates only what exists.

  const firstDate = sample[0]?.date;
  console.log("verifyStaticSeed:", {
    totalFixtures: total,
    date1980to1971Count: zeroDates,
    earliestDate: firstDate,
  });

  const all = await Match.find({}).lean();
  const invalidDates = all.filter((m) => !isValid2026(new Date((m as any).date))).length;

  console.log("verifyStaticSeed date validity:", {
    invalidDateCount: invalidDates,
    allDates2026: invalidDates === 0,
  });

  // Self-match validation (should already be handled by validateAndSummarizeFixtures)
  const selfMatches = all.filter((m) => m.teamA === m.teamB).length;
  console.log("verifyStaticSeed selfMatches:", { selfMatches });

  await (await import("mongoose")).disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

