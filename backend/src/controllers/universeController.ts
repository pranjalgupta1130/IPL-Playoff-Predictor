import { Request, Response } from "express";
import { loadUniverseState } from "../services/universeService";

function sanitizeUpcomingFixture(match: any) {
  // Only expose the requested minimal fields.
  const {
    _id,
    fixtureId,
    matchNumber,
    stage,
    teamA,
    teamB,
    date,
    venue,
  } = match;

  return {
    _id,
    fixtureId,
    matchNumber,
    stage,
    teamA,
    teamB,
    date,
    venue,
    completed: false,
  };
}

export async function getUniverse(_req: Request, res: Response): Promise<void> {
  try {
    const universe = await loadUniverseState();

    const completedMatches = universe.baseline.completedMatches as any[];
    const upcomingMatches = universe.baseline.upcomingMatches as any[];

    // Programmatic validation + future-result leakage prevention
    const cutoffMatchNumber = 50;

    if (!Array.isArray(upcomingMatches)) {
      throw new Error("UniverseController: upcomingMatches missing/invalid");
    }

    if (upcomingMatches.length !== 20) {
      throw new Error(`UniverseController: upcoming fixture count must be 20, got ${upcomingMatches.length}`);
    }

    const matchNums = upcomingMatches.map((m) => m.matchNumber);
    const duplicates = matchNums.filter((n, i) => matchNums.indexOf(n) !== i);
    if (duplicates.length > 0) {
      throw new Error(`UniverseController: duplicate matchNumber(s) in upcoming: ${JSON.stringify(duplicates)}`);
    }

    for (const m of upcomingMatches) {
      if (m.stage !== "league") {
        throw new Error(`UniverseController: non-league fixture included matchNumber=${m.matchNumber} stage=${m.stage}`);
      }
      if (typeof m.matchNumber !== "number" || m.matchNumber < 51 || m.matchNumber > 70) {
        throw new Error(`UniverseController: upcoming matchNumber out of range: ${m.matchNumber}`);
      }

      if (m.completed !== false) {
        throw new Error(`UniverseController: upcoming fixture must be completed=false matchNumber=${m.matchNumber}`);
      }

      // Ensure no real-result fields leak.
      for (const leakField of [
        "winner",
        "result",
        "margin",
        "marginType",
        "chaseRuns",
        "scores",
        "innings",
      ]) {
        if (m[leakField] !== undefined) {
          throw new Error(`UniverseController: future-result leakage field '${leakField}' present for matchNumber=${m.matchNumber}`);
        }
      }

      // Also ensure we never include a completed=true field through Mongo.
      if (m.completed === true) {
        throw new Error(`UniverseController: completed=true leaked for matchNumber=${m.matchNumber}`);
      }
    }

    // Ensure we have exactly 51..70
    const expected = new Set(Array.from({ length: 20 }, (_, i) => 51 + i));
    const actual = new Set(matchNums);
    if (expected.size !== actual.size || [...expected].some((n) => !actual.has(n))) {
      throw new Error(
        `UniverseController: expected upcoming matchNumbers 51..70, got ${JSON.stringify([...actual].sort((a, b) => a - b))}`
      );
    }

    const upcomingFixtures = upcomingMatches
      .sort((a, b) => a.matchNumber - b.matchNumber)
      .map(sanitizeUpcomingFixture);

    res.json({
      cutoffMatchNumber,
      completedCount: completedMatches.length,
      upcomingCount: upcomingFixtures.length,
      upcomingFixtures,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: "Failed to build universe", error: error?.message ?? String(error) });
  }
}

