import { PLAYOFF_SPOTS, POINTS_PER_WIN } from "../../constants/tournament";
import { IMatch } from "../../models/Match";
import { ITeam } from "../../models/Team";
import { IPrediction } from "../../models/Prediction";

export type MathematicalStatus = {
  mathematicallyEliminated: boolean;
  mathematicallyQualified: boolean;
};

/**
 * Helper: determine mathematically feasible Top-4 placement using exact winner combinations.
 * Accepts optional predictions to treat as fixed outcomes.
 */
export function analyzeMathematicalStatus(
  teams: ITeam[],
  upcomingMatches: IMatch[],
  predictions: IPrediction[] = []
): Map<string, MathematicalStatus> {
  // Defensive invariants.
  if (!Array.isArray(teams) || teams.length !== 10) {
    throw new Error(`analyzeMathematicalStatus expected teams.length===10, got ${teams.length}`);
  }

  const predictionMap = new Map<string, IPrediction>();
  if (Array.isArray(predictions)) {
    predictions.forEach((p) => {
      if (p && p.matchId) {
        predictionMap.set(p.matchId.toString(), p);
      }
    });
  }

  // Pre-calculate baseline points with predictions applied
  const currentPoints = new Map<string, number>();
  for (const t of teams) {
    currentPoints.set(t.name, t.points);
  }

  const remainingMatches = new Map<string, number>();
  for (const t of teams) {
    remainingMatches.set(t.name, 0);
  }

  for (const m of upcomingMatches) {
    const pred = predictionMap.get(m._id.toString());
    if (pred) {
      currentPoints.set(pred.predictedWinner, (currentPoints.get(pred.predictedWinner) || 0) + POINTS_PER_WIN);
    } else {
      remainingMatches.set(m.teamA, (remainingMatches.get(m.teamA) || 0) + 1);
      remainingMatches.set(m.teamB, (remainingMatches.get(m.teamB) || 0) + 1);
    }
  }

  const result = new Map<string, MathematicalStatus>();

  for (const t of teams) {
    const maxPts = (currentPoints.get(t.name) || 0) + (remainingMatches.get(t.name) || 0) * POINTS_PER_WIN;

    // Mathematically eliminated if at least 4 teams have current points (with predictions) strictly greater than our max possible points.
    let teamsAlreadyAhead = 0;
    for (const other of teams) {
      if (other.name === t.name) continue;
      const otherPts = currentPoints.get(other.name) || 0;
      if (otherPts > maxPts) {
        teamsAlreadyAhead++;
      }
    }

    const mathematicallyEliminated = teamsAlreadyAhead >= PLAYOFF_SPOTS;

    // Mathematically qualified if even after losing all remaining matches, fewer than 4 other teams can pass or tie us.
    let teamsCanPassOrTie = 0;
    const minPts = currentPoints.get(t.name) || 0;
    for (const other of teams) {
      if (other.name === t.name) continue;
      const otherMax = (currentPoints.get(other.name) || 0) + (remainingMatches.get(other.name) || 0) * POINTS_PER_WIN;
      if (otherMax >= minPts) {
        teamsCanPassOrTie++;
      }
    }

    const mathematicallyQualified = teamsCanPassOrTie < PLAYOFF_SPOTS;

    result.set(t.name, {
      mathematicallyEliminated,
      mathematicallyQualified,
    });
  }

  return result;
}

export function isMathematicallyEliminated(
  team: ITeam,
  allTeams: ITeam[],
  upcomingMatches: IMatch[],
  predictions: IPrediction[] = []
): boolean {
  return analyzeMathematicalStatus(allTeams, upcomingMatches, predictions).get(team.name)!
    .mathematicallyEliminated;
}

export function isMathematicallyQualified(
  team: ITeam,
  allTeams: ITeam[],
  upcomingMatches: IMatch[],
  predictions: IPrediction[] = []
): boolean {
  return analyzeMathematicalStatus(allTeams, upcomingMatches, predictions).get(team.name)!
    .mathematicallyQualified;
}
