import { IMatch } from "../../models/Match";
import { IPrediction } from "../../models/Prediction";



export const FIXED_CUTOFF_MATCH_NUMBER = 50;

export type DerivedUniverse = {
  baseline: {
    completedMatches1to50: IMatch[];
    upcomingMatches51to70: IMatch[];
  };
  simulationUniverse: {
    upcomingMatches51to70: IMatch[];
    predictionsForUpcoming: IPrediction[];
  };
};

export function deriveLeagueUniverse(
  allMatches: IMatch[],
  allPredictions: IPrediction[],
  opts?: { cutoffMatchNumber?: number }
): DerivedUniverse {
  const cutoff = opts?.cutoffMatchNumber ?? FIXED_CUTOFF_MATCH_NUMBER;

  const leagueMatches = allMatches.filter((m) => m.stage === "league");

  // Prevent using any playoff fixtures in the simulation universe.
  const leagueCompleted1to50 = leagueMatches.filter(
    (m) => m.completed && typeof m.matchNumber === "number" && m.matchNumber <= cutoff
  );

  // IMPORTANT: future-result leakage prevention.
  // Do not trust persisted completed/winner/margin for matchNumber 51-70.
  // Those matches must be treated as upcoming fixtures.
  const leagueUpcoming51to70Base = leagueMatches.filter(
    (m) => typeof m.matchNumber === "number" && m.matchNumber >= 51 && m.matchNumber <= 70
  );

  // We intentionally return lean-ish plain objects to avoid mongoose Document type mismatch.
  const leagueUpcoming51to70 = leagueUpcoming51to70Base.map((m) => ({
    ...(m.toObject ? m.toObject() : (m as any)),
    completed: false,
    winner: undefined,
    margin: undefined,
    marginType: undefined,
    chaseRuns: undefined,
  })) as unknown as IMatch[];

  // Ensure we only keep predictions that belong to the upcoming league fixtures.
  const upcomingIds = new Set(leagueUpcoming51to70.map((m) => m._id.toString()));
  const predictionsForUpcoming = allPredictions.filter((p) => upcomingIds.has(p.matchId.toString()));

  return {
    baseline: {
      completedMatches1to50: leagueCompleted1to50,
      upcomingMatches51to70: leagueUpcoming51to70,
    },
    simulationUniverse: {
      upcomingMatches51to70: leagueUpcoming51to70,
      predictionsForUpcoming,
    },
  };
}


export function buildUpcomingFixturesExactly20(leagueUpcoming51to70: IMatch[]): IMatch[] {
  // MVP requirement: exactly 20 upcoming fixtures.
  // In a correct seed, league matchNumbers 51-70 inclusive -> 20 matches.
  // If data is malformed, fail hard so we don't silently create wrong universes.
  if (leagueUpcoming51to70.length !== 20) {
    throw new Error(
      `Expected exactly 20 upcoming fixtures for matchNumber 51-70, got ${leagueUpcoming51to70.length}`
    );
  }
  return leagueUpcoming51to70.sort((a, b) => (a.matchNumber! - b.matchNumber!));
}

export function buildCompletedMatchesExactly50(completed1to50: IMatch[]): IMatch[] {
  // MVP requirement: baseline is matches 1-50 exactly once.
  // If data is malformed, fail hard.
  const nums = completed1to50
    .map((m) => m.matchNumber)
    .filter((x): x is number => typeof x === "number");

  const unique = new Set(nums);
  if (unique.size !== 50) {
    throw new Error(
      `Expected 50 unique completed league matchNumbers for baseline (1-50), got unique=${unique.size}`
    );
  }

  // Also ensure there are no matchNumbers outside 1-50.
  for (const n of unique) {
    if (n < 1 || n > 50) {
      throw new Error(`Baseline contains out-of-range matchNumber=${n}`);
    }
  }

  // We do NOT override completed flags here; baseline uses actual completed results.
  return completed1to50.sort((a, b) => (a.matchNumber! - b.matchNumber!));
}

