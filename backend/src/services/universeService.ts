import { Team } from "../models/Team";
import { Match } from "../models/Match";
import { Prediction } from "../models/Prediction";
import { UniverseState } from "../types/universe";
import { buildFullStandings } from "./standingsService";
import { syncFixturesToMongo } from "./cricketData";
import { deriveLeagueUniverse, FIXED_CUTOFF_MATCH_NUMBER } from "./universe/derivedLeagueUniverse";
import { reconstructBaselineStandingsFromMatches1to50 } from "./standings/baselineStandingsFromMatches1to50";
import { checkNrrReconstructionSufficiency } from "./nrr/minimalNrrInputs";


let didSyncFixtures = false;

/**
 * Load official baseline + simulation layer without mutating baseline.
 *
 * If CRICAPI_KEY is available, we sync fixtures to Mongo once at server startup.
 * This preserves existing Monte Carlo + qualification systems.
 */
export async function loadUniverseState(): Promise<UniverseState> {
  // Production requirement: never silently fall back to synthetic fixtures.
  // Dev requirement: allow lightweight seed fallback only for local dev/UI testing.
  const mode = process.env.NODE_ENV || "development";
  const isDev = mode !== "production";

  if (!didSyncFixtures) {
    didSyncFixtures = true;
    try {
      await syncFixturesToMongo();

    } catch (e) {
      if (!isDev) {
        throw e;
      }
      console.error("[CricAPI sync] Failed; DEV mode will use existing DB fixtures:", e);
    }
  }


  const [teams, matches, predictions] = await Promise.all([
    Team.find().lean(),
    Match.find().lean(),
    Prediction.find().lean(),
  ]);

  console.log("Total matches:", matches.length);

if (matches.length > 0) {
  console.log("First match document:");
  console.dir(matches[0], { depth: null });
}

  // IMPORTANT: Predictions must be applied to the derived universe.
  // For Match-50 architecture, the simulation and projected standings depend on the derived upcoming set (51-70).
  // If this ever breaks due to stale prediction ids or identifier shape, derived.simulationUniverse.predictionsForUpcoming will be empty.


  // Derive fixed-cutoff universe.
  const derived = deriveLeagueUniverse(
    matches as any,
    predictions as any,
    { cutoffMatchNumber: FIXED_CUTOFF_MATCH_NUMBER }
  );

  // Verify exact baseline/upcoming sizes and uniqueness.
  const completedMatches1to50 = derived.baseline.completedMatches1to50;
  const upcomingMatches51to70 = derived.baseline.upcomingMatches51to70;

  // Fail hard if the seed is not exactly aligned with requirements.
  const leagueBaselineNums = new Set(
    completedMatches1to50
      .map((m) => m.matchNumber)
      .filter((x): x is number => typeof x === "number")
  );
  if (leagueBaselineNums.size !== 50) {
    throw new Error(`Expected 50 unique league baseline matchNumbers (1-50), got ${leagueBaselineNums.size}`);
  }

  const upcomingNums = new Set(
    upcomingMatches51to70
      .map((m) => m.matchNumber)
      .filter((x): x is number => typeof x === "number")
  );
  if (upcomingMatches51to70.length !== 20 || upcomingNums.size !== 20) {
    throw new Error(`Expected exactly 20 upcoming fixtures for matchNumber 51-70; got ${upcomingMatches51to70.length}`);
  }

  // NRR reconstruction sufficiency check.
  const nrrSuff = checkNrrReconstructionSufficiency(completedMatches1to50);
  if (!nrrSuff.hasRequiredFields) {
    throw new Error(
      `NRR reconstruction requires winner/margin/marginType for completed matches. Missing: ${JSON.stringify(nrrSuff.missingForCompleted.slice(0, 3), null, 2)}`
    );
  }

  // Baseline standings reconstructed from completed matches 1-50 only.
  const baselineStandings = reconstructBaselineStandingsFromMatches1to50(
    teams as unknown as Parameters<typeof reconstructBaselineStandingsFromMatches1to50>[0],
    completedMatches1to50
  );

  // If we re-use buildFullStandings, it recalculates "real" standings from team snapshots.
  // We do NOT want that; we need real standings to reflect match 1-50 reconstruction.
  // For MVP, we only need projected standings universe for qualification/NRR.
  // We therefore re-run projected calculation using baseline standings snapshot values.

  // Construct the authoritative team snapshot list for downstream logic.
  // Do NOT rely on MongoDB Team collection (it may be empty).
  const reconstructedTeams = baselineStandings.standings.map((r) => {
    const existing = (teams as any[]).find((t) => t.name === r.name);
    return {
      ...(existing ?? { name: r.name, shortName: r.shortName }),
      played: r.played,
      wins: r.wins,
      losses: r.losses,
      points: r.points,
      nrr: r.nrr,
      shortName: r.shortName,
    };
  });


  // Upcoming universe: predictions for derived league matchNumber 51-70 only.
  const fullStandings = buildFullStandings(
    reconstructedTeams as unknown as Parameters<typeof buildFullStandings>[0],
    upcomingMatches51to70 as unknown as Parameters<typeof buildFullStandings>[1],
    derived.simulationUniverse.predictionsForUpcoming as unknown as Parameters<typeof buildFullStandings>[2]
  );

  return {
    baseline: {
      teams: reconstructedTeams as unknown as UniverseState["baseline"]["teams"],
      completedMatches: completedMatches1to50 as unknown as UniverseState["baseline"]["completedMatches"],
      upcomingMatches: upcomingMatches51to70 as unknown as UniverseState["baseline"]["upcomingMatches"],
    },
    simulation: {
      predictions: derived.simulationUniverse.predictionsForUpcoming as unknown as UniverseState["simulation"]["predictions"],
      fullStandings,
    },
  };
}

