import { PLAYOFF_SPOTS } from "../../constants/tournament";
import { IMatch } from "../../models/Match";
import { IPrediction } from "../../models/Prediction";
import { ITeam } from "../../models/Team";
import { getTeamShortName } from "../../constants/teams";
import {
  applyPrediction,
  applyMatchResult,
  sortStandings,
  snapshotFromTeams,
  rowsFromSnapshot,
  FullStandingsResult,
} from "../standingsService";
import { calculateMatchWinProbability } from "./matchWinProbability";
import { analyzeMathematicalStatus } from "./mathematicalElimination";

import { createRng } from "./rng";

const DEFAULT_ITERATIONS = 1000;

export type VolatilityLevel = "low" | "medium" | "high";

export interface MonteCarloTeamOdds {
  teamName: string;
  shortName: string;
  playoffPercentage: number;
  topTwoPercentage: number;
  eliminationPercentage: number;
  percentage: number;
  volatility: VolatilityLevel;
  confidenceRange: { low: number; high: number };
  confidence: "high" | "medium" | "low";
  projectedQualified: boolean;
  rank: number;
  insight: string;
  mathematicallyEliminated?: boolean;
  mathematicallyQualified?: boolean;
}

export interface MonteCarloResult {
  iterations: number;
  odds: MonteCarloTeamOdds[];
  completedAt: number;
  method: "monte_carlo";
}

function liveFromSnapshot(snapshot: ReturnType<typeof snapshotFromTeams>): Map<string, ITeam> {
  const map = new Map<string, ITeam>();
  snapshot.forEach((row) => map.set(row.name, row as ITeam));
  return map;
}

function simulateMatch(
  snapshot: ReturnType<typeof snapshotFromTeams>,
  match: IMatch,
  baselineByName: Map<string, ITeam>,
  rng: () => number
): void {
  const standings = sortStandings(rowsFromSnapshot(snapshot));
  const liveByName = liveFromSnapshot(snapshot);
  const { probabilityA } = calculateMatchWinProbability(
    match.teamA,
    match.teamB,
    liveByName,
    standings,
    baselineByName
  );
  const winner = rng() < probabilityA ? match.teamA : match.teamB;
  const isChase = rng() < 0.55;
  let marginType: import("../../models/Match").MarginType;
  let margin: number;
  let chaseRuns: number | undefined;


  if (isChase) {
    marginType = rng() < 0.5 ? "chase_overs" : "balls_remaining";
    margin = marginType === "chase_overs"
      ? 14 + Math.floor(rng() * 5) + (Math.floor(rng() * 6)) / 10
      : 8 + Math.floor(rng() * 35);
    chaseRuns = 155 + Math.floor(rng() * 45);
  } else {
    marginType = "defended_runs";
    margin = 4 + Math.floor(rng() * 32);
  }

  applyMatchResult(snapshot, match.teamA, match.teamB, winner, margin, marginType, chaseRuns);
}

function simulateSeason(
  teams: ITeam[],
  upcoming: IMatch[],
  predictionByMatch: Map<string, IPrediction>,
  baselineByName: Map<string, ITeam>,
  rng: () => number
) {
  const snapshot = snapshotFromTeams(teams);
  for (const match of upcoming) {
    const pred = predictionByMatch.get(match._id.toString());
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

function generateMonteCarloInsight(odds: MonteCarloTeamOdds): string {
  const { shortName, playoffPercentage, volatility, eliminationPercentage } = odds;
  if (odds.mathematicallyEliminated) {
    return `${shortName} is mathematically eliminated from the playoffs.`;
  }
  if (odds.mathematicallyQualified) {
    return `${shortName} has mathematically qualified and locked in a playoff spot!`;
  }
  if (playoffPercentage >= 95) {
    return `${shortName} qualification is nearly secured (${playoffPercentage}% playoff odds).`;
  }
  if (volatility === "high") {
    return `${shortName} playoff odds are highly volatile — small result swings matter.`;
  }
  if (playoffPercentage < 15) {
    return `${shortName} faces long elimination odds (${eliminationPercentage}%) in simulations.`;
  }
  return `${shortName}: ${playoffPercentage}% playoff · ${odds.topTwoPercentage}% top-2 · ${eliminationPercentage}% out.`;
}

function calibrate(
  raw: MonteCarloTeamOdds,
  team: ITeam,
  teams: ITeam[],
  upcoming: IMatch[],
  predictions: IPrediction[],
  _iterations: number
): MonteCarloTeamOdds {
  // Mathematical elimination/qualification flags are metadata only.
  // They MUST NOT overwrite Monte Carlo percentages.
  const statusMap = analyzeMathematicalStatus(teams, upcoming, predictions);
  const status = statusMap.get(team.name)!;

  const calibrated = {
    ...raw,
    mathematicallyEliminated: status.mathematicallyEliminated,
    mathematicallyQualified: status.mathematicallyQualified,

    // Keep `percentage` consistent with playoffPercentage as previously used.
    percentage: raw.playoffPercentage,
  };

  calibrated.insight = generateMonteCarloInsight(calibrated);
  return calibrated;
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

export function runMonteCarloSimulation(
  teams: ITeam[],
  upcoming: IMatch[],
  predictions: IPrediction[],
  fullStandings: FullStandingsResult,
  iterations = DEFAULT_ITERATIONS,
  seed?: number
): MonteCarloResult {
  const rng = createRng(seed);
  const predictionByMatch = new Map(predictions.map((p) => [p.matchId.toString(), p]));
  const baselineByName = new Map(teams.map((t) => [t.name, t]));
  const projected = fullStandings.projected.standings;

  const counters = new Map<string, { playoff: number; topTwo: number; eliminated: number }>();
  for (const t of teams) counters.set(t.name, { playoff: 0, topTwo: 0, eliminated: 0 });

  for (let i = 0; i < iterations; i++) {
    const final = simulateSeason(teams, upcoming, predictionByMatch, baselineByName, rng);
    final.forEach((row, index) => {
      const rank = row.rank ?? index + 1;
      const c = counters.get(row.name)!;
      if (rank <= PLAYOFF_SPOTS) c.playoff += 1;
      if (rank <= 2) c.topTwo += 1;
      if (rank > PLAYOFF_SPOTS) c.eliminated += 1;
    });
  }

  const odds = teams
    .map((t) => {
      const c = counters.get(t.name)!;

      // Defensive validation on raw counters (must be the authoritative source).
      if (c.topTwo < 0 || c.playoff < 0 || c.eliminated < 0) {
        throw new Error(`MonteCarlo counters negative for team=${t.name}: ${JSON.stringify(c)}`);
      }
      if (c.topTwo > c.playoff) {
        throw new Error(
          `MonteCarlo invariant failed (topTwo>playoff) for team=${t.name}: topTwo=${c.topTwo} playoff=${c.playoff} eliminated=${c.eliminated} iterations=${iterations}`
        );
      }
      if (c.playoff + c.eliminated !== iterations) {
        throw new Error(
          `MonteCarlo invariant failed (playoff+eliminated!=iterations) for team=${t.name}: playoff=${c.playoff} eliminated=${c.eliminated} iterations=${iterations}`
        );
      }

      const playoffPercentage = Math.round((c.playoff / iterations) * 100);
      const topTwoPercentage = Math.round((c.topTwo / iterations) * 100);

      // Complement from playoffPercentage so displayed percentages are consistent.
      const eliminationPercentage = Math.max(0, Math.min(100, 100 - playoffPercentage));

      if (topTwoPercentage > playoffPercentage) {
        throw new Error(
          `MonteCarlo rounding invariant failed (topTwoPercentage>playoffPercentage) for team=${t.name}: topTwoPercentage=${topTwoPercentage} playoffPercentage=${playoffPercentage}`
        );
      }

      const volatility = resolveVolatility(playoffPercentage);
      const range = confidenceRange(playoffPercentage, iterations);
      const confidence = toConfidence(playoffPercentage, volatility);

      const raw: MonteCarloTeamOdds = {
        teamName: t.name,
        shortName: t.shortName || getTeamShortName(t.name),
        playoffPercentage,
        topTwoPercentage,
        eliminationPercentage,
        percentage: 0,
        volatility,
        confidenceRange: range,
        confidence,
        projectedQualified: !!projected.find((r) => r.name === t.name)?.qualified,
        rank: projected.find((r) => r.name === t.name)?.rank ?? 10,
        insight: "",
      };

      raw.percentage = raw.playoffPercentage;
      return calibrate(raw, t, teams, upcoming, predictions, iterations);
    })
    .sort((a, b) => b.playoffPercentage - a.playoffPercentage);



  return { iterations, odds, completedAt: Date.now(), method: "monte_carlo" };
}
