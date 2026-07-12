import { getTeamShortName } from "@/constants/teams";
import { PLAYOFF_SPOTS } from "@/constants/tournament";
import {
  applyPrediction,
  sortStandings,
  snapshotFromTeams,
  rowsFromSnapshot,
} from "@/services/standingsEngine";
import { simulateMatch } from "@/services/simulation/simulateMatch";
import {
  isMathematicallyEliminated,
  isMathematicallyQualified,
} from "@/services/simulation/mathematicalElimination";
import {
  createOutcomeCounters,
  recordPlayoffOutcomes,
  validateOutcomeTotals,
} from "@/services/simulation/playoffClassification";
import { createRng } from "@/services/simulation/rng";
import {
  dumpQualificationCounters,
  isSimulationDebugEnabled,
  logSimulationSnapshot,
} from "@/services/simulation/simulationDebug";
import type {
  FullStandingsResult,
  Match,
  MonteCarloResult,
  MonteCarloTeamOdds,
  Prediction,
  TeamBaseline,
  VolatilityLevel,
} from "@/types";

const DEFAULT_ITERATIONS = 1000;
const CHUNK_SIZE = 250;

/** Minimum playoff % when team is still mathematically alive */
const ALIVE_FLOOR_PCT = 1;
/** Cap when not mathematically clinched */
const UNCLINCHED_CAP_PCT = 99;

export interface MonteCarloInput {
  teams: TeamBaseline[];
  upcomingMatches: Match[];
  predictions: Prediction[];
  fullStandings: FullStandingsResult;
  iterations?: number;
  seed?: number;
}

function buildPredictionMap(predictions: Prediction[]): Map<string, Prediction> {
  const map = new Map<string, Prediction>();

  for (const p of predictions) {
    if (!p?.matchId) continue;

    const id =
      typeof p.matchId === "string"
        ? p.matchId
        : p.matchId?._id;

    if (!id) continue;

    map.set(id, p);
  }

  return map;
}

function buildBaselineMap(teams: TeamBaseline[]): Map<string, TeamBaseline> {
  return new Map(teams.map((t) => [t.name, { ...t }]));
}

function resolveVolatility(playoffPct: number): VolatilityLevel {
  if (playoffPct >= 88 || playoffPct <= 12) return "low";
  if (playoffPct >= 28 && playoffPct <= 72) return "high";
  return "medium";
}

function confidenceRange(playoffPct: number, iterations: number): {
  low: number;
  high: number;
} {
  const p = playoffPct / 100;
  const se = Math.sqrt((p * (1 - p)) / iterations);
  const margin = se * 1.96 * 100;
  return {
    low: Math.max(0, Math.round(playoffPct - margin)),
    high: Math.min(100, Math.round(playoffPct + margin)),
  };
}

function toConfidence(
  playoffPct: number,
  volatility: VolatilityLevel
): "high" | "medium" | "low" {
  if (volatility === "high") return "medium";
  if (playoffPct >= 75 || playoffPct <= 20) return "high";
  if (playoffPct >= 40) return "medium";
  return "low";
}

/**
 * Apply math constraints + calibration so alive teams are not stuck at 0%
 * unless truly eliminated.
 */
function calibrateTeamOdds(
  raw: MonteCarloTeamOdds,
  team: TeamBaseline,
  teams: TeamBaseline[],
  upcoming: Match[],
  iterations: number
): MonteCarloTeamOdds {
  const eliminated = isMathematicallyEliminated(team, teams, upcoming);
  const clinched = isMathematicallyQualified(team, teams, upcoming);

  let playoffPercentage = raw.playoffPercentage;
  let eliminationPercentage = raw.eliminationPercentage;

  if (eliminated) {
    playoffPercentage = 0;
    eliminationPercentage = 100;
  } else if (clinched) {
    playoffPercentage = 100;
    eliminationPercentage = 0;
  } else {
    if (playoffPercentage === 0 && iterations > 0) {
      // Still alive but MC found no paths — floor at 1% or 1 simulation
      playoffPercentage = Math.max(ALIVE_FLOOR_PCT, Math.ceil(100 / iterations));
      eliminationPercentage = Math.min(
        99,
        100 - playoffPercentage
      );
    } else if (playoffPercentage > 0) {
      playoffPercentage = Math.min(UNCLINCHED_CAP_PCT, playoffPercentage);
      eliminationPercentage = Math.max(
        0,
        Math.min(100, 100 - playoffPercentage)
      );
    }
  }

  const volatility = resolveVolatility(playoffPercentage);
  const range = confidenceRange(playoffPercentage, iterations);

  return {
    ...raw,
    playoffPercentage,
    eliminationPercentage,
    percentage: playoffPercentage,
    volatility,
    confidenceRange: range,
    confidence: toConfidence(playoffPercentage, volatility),
    mathematicallyEliminated: eliminated,
    mathematicallyQualified: clinched,
    insight: "",
  };
}

export function generateMonteCarloInsight(odds: MonteCarloTeamOdds): string {
  const { shortName, playoffPercentage, volatility, eliminationPercentage } = odds;

  if (odds.mathematicallyEliminated) {
    return `${shortName} is mathematically eliminated from the top ${PLAYOFF_SPOTS}.`;
  }
  if (odds.mathematicallyQualified) {
    return `${shortName} has clinched a playoff spot on points (100% in model).`;
  }
  if (playoffPercentage >= 85 && volatility === "low") {
    return `${shortName} qualification is nearly secured (${playoffPercentage}% playoff odds).`;
  }
  if (volatility === "high") {
    return `${shortName} playoff odds are highly volatile — small result swings matter.`;
  }
  if (playoffPercentage < 15 && !odds.mathematicallyEliminated) {
    return `${shortName} is a long shot (${playoffPercentage}%) but remains mathematically alive.`;
  }
  if (eliminationPercentage >= 70) {
    return `${shortName} faces long elimination odds (${eliminationPercentage}%) in simulations.`;
  }
  return `${shortName}: ${playoffPercentage}% playoff · ${odds.topTwoPercentage}% top-2 · ${eliminationPercentage}% out.`;
}

/**
 * One simulated season: user predictions fixed, other games probabilistic.
 * Strength/NRR use live snapshot each match (see simulateMatch).
 */
export function simulateSeason(
  teams: TeamBaseline[],
  upcomingMatches: Match[],
  predictionByMatch: Map<string, Prediction>,
  baselineByName: Map<string, TeamBaseline>,
  rng: () => number
): ReturnType<typeof sortStandings> {
  const snapshot = snapshotFromTeams(teams);

  for (const match of upcomingMatches) {
    const pred = predictionByMatch.get(match._id);
    if (pred) {
      applyPrediction(snapshot, {
        teamA: match.teamA,
        teamB: match.teamB,
        predictedWinner: pred.predictedWinner,
        margin: pred.margin,
        marginType: pred.marginType,
        chaseRuns: pred.chaseRuns,
      });
    } else {
      simulateMatch(snapshot, match, baselineByName, rng);
    }
  }

  return sortStandings(rowsFromSnapshot(snapshot));
}

function runSimulationLoop(
  input: MonteCarloInput,
  rng: () => number
): ReturnType<typeof createOutcomeCounters> {
  const iterations = input.iterations ?? DEFAULT_ITERATIONS;
  const predictionByMatch = buildPredictionMap(input.predictions);
  const baselineByName = buildBaselineMap(input.teams);
  const counters = createOutcomeCounters(input.teams.map((t) => t.name));

  for (let i = 0; i < iterations; i++) {
    const finalStandings = simulateSeason(
      input.teams,
      input.upcomingMatches,
      predictionByMatch,
      baselineByName,
      rng
    );

    recordPlayoffOutcomes(counters, finalStandings);

    if (isSimulationDebugEnabled() && i < 3) {
      logSimulationSnapshot(i, finalStandings);
    }
  }

  if (isSimulationDebugEnabled()) {
    const check = validateOutcomeTotals(counters, iterations);
    if (!check.valid) console.warn("[MC audit]", check.errors);
    dumpQualificationCounters(counters, iterations);
  }

  return counters;
}

function countersToOdds(
  input: MonteCarloInput,
  counters: Map<
    string,
    { playoff: number; topTwo: number; eliminated: number }
  >,
  iterations: number
): MonteCarloTeamOdds[] {
  const projected = input.fullStandings.projected.standings;

  return input.teams.map((t) => {
    const c = counters.get(t.name)!;
    const rawPlayoff = Math.round((c.playoff / iterations) * 100);
    const topTwoPercentage = Math.round((c.topTwo / iterations) * 100);
    const rawElim = Math.round((c.eliminated / iterations) * 100);
    const projRow = projected.find((r) => r.name === t.name);

    const raw: MonteCarloTeamOdds = {
      teamName: t.name,
      shortName: t.shortName || getTeamShortName(t.name),
      playoffPercentage: rawPlayoff,
      topTwoPercentage,
      eliminationPercentage: rawElim,
      percentage: rawPlayoff,
      volatility: "medium",
      confidenceRange: { low: 0, high: 100 },
      confidence: "medium",
      projectedQualified: !!projRow?.qualified,
      rank: projRow?.rank ?? 10,
      insight: "",
    };

    const calibrated = calibrateTeamOdds(
      raw,
      t,
      input.teams,
      input.upcomingMatches,
      iterations
    );
    calibrated.insight = generateMonteCarloInsight(calibrated);
    return calibrated;
  });
}

export function runMonteCarloSimulation(input: MonteCarloInput): MonteCarloResult {
  const iterations = input.iterations ?? DEFAULT_ITERATIONS;
  const rng = createRng(input.seed);
  const counters = runSimulationLoop({ ...input, iterations }, rng);
  const odds = countersToOdds(input, counters, iterations).sort(
    (a, b) => b.playoffPercentage - a.playoffPercentage
  );

  return {
    iterations,
    odds,
    completedAt: Date.now(),
    method: "monte_carlo",
  };
}

export function runMonteCarloSimulationAsync(
  input: MonteCarloInput,
  onProgress?: (progress: number) => void
): Promise<MonteCarloResult> {
  const iterations = input.iterations ?? DEFAULT_ITERATIONS;
  const rng = createRng(input.seed);
  const predictionByMatch = buildPredictionMap(input.predictions);
  const baselineByName = buildBaselineMap(input.teams);
  const counters = createOutcomeCounters(input.teams.map((t) => t.name));

  let completed = 0;

  return new Promise((resolve) => {
    const runChunk = () => {
      const end = Math.min(completed + CHUNK_SIZE, iterations);

      while (completed < end) {
        const finalStandings = simulateSeason(
          input.teams,
          input.upcomingMatches,
          predictionByMatch,
          baselineByName,
          rng
        );
        recordPlayoffOutcomes(counters, finalStandings);
        completed++;
      }

      onProgress?.(completed / iterations);

      if (completed < iterations) {
        setTimeout(runChunk, 0);
        return;
      }

      const odds = countersToOdds(input, counters, iterations).sort(
        (a, b) => b.playoffPercentage - a.playoffPercentage
      );

      resolve({
        iterations,
        odds,
        completedAt: Date.now(),
        method: "monte_carlo",
      });
    };

    setTimeout(runChunk, 0);
  });
}

export function calculatePlayoffOdds(
  teamName: string,
  result: MonteCarloResult
): number {
  return result.odds.find((o) => o.teamName === teamName)?.playoffPercentage ?? 0;
}

export function calculateTop2Odds(
  teamName: string,
  result: MonteCarloResult
): number {
  return result.odds.find((o) => o.teamName === teamName)?.topTwoPercentage ?? 0;
}
