import { getTeamShortName } from "@/constants/teams";
import { PLAYOFF_SPOTS, POINTS_PER_WIN } from "@/constants/tournament";
import {
  isMathematicallyEliminated,
  countRemainingMatches,
} from "@/services/simulation/mathematicalElimination";
import { getMaximumPossiblePoints } from "@/utils/tournamentMath";
import type {
  FullStandingsResult,
  Match,
  QualificationRequirements,
  QualificationStatus,
  NrrPressure,
  StandingsRow,
  TeamBaseline,
} from "@/types";

export { getMaximumPossiblePoints } from "@/utils/tournamentMath";

function getRemainingMatches(teamName: string, upcoming: Match[]): Match[] {
  return upcoming.filter((m) => m.teamA === teamName || m.teamB === teamName);
}

export function resolveQualificationStatus(
  team: TeamBaseline,
  teams: TeamBaseline[],
  upcomingMatches: Match[],
  projected: StandingsRow[],
  playoffPercentage?: number
): QualificationStatus {
  const row = projected.find((r) => r.name === team.name);
  const rank = row?.rank ?? 10;

  if (isMathematicallyEliminated(team, teams, upcomingMatches)) {
    return "eliminated";
  }

  if (playoffPercentage != null) {
    if (playoffPercentage >= 92) return "strong_favorite";
    if (playoffPercentage >= 70) return "likely";
    if (playoffPercentage >= 40) return "in_contention";
    if (playoffPercentage >= 12) return "mathematically_alive";
    return "mathematically_alive";
  }

  if (row?.qualified && rank <= PLAYOFF_SPOTS) return "qualified";

  const fourth = projected[Math.min(PLAYOFF_SPOTS - 1, projected.length - 1)];
  const remaining = countRemainingMatches(team.name, upcomingMatches);
  const maxPts = getMaximumPossiblePoints(team.points, remaining);
  const gapToFourth = fourth.points - team.points;

  if (team.nrr < fourth.nrr - 0.1 && gapToFourth <= 2) return "nrr_battle";
  if (maxPts >= fourth.points + 2) return "likely";
  return "mathematically_alive";
}

function fourthPlaceRow(projected: StandingsRow[]): StandingsRow {
  return projected[Math.min(PLAYOFF_SPOTS - 1, projected.length - 1)];
}

function fifthMaxPossiblePoints(
  projected: StandingsRow[],
  upcoming: Match[],
  teams: TeamBaseline[]
): number {
  const topNames = new Set(projected.slice(0, PLAYOFF_SPOTS).map((r) => r.name));
  let maxFifth = 0;
  for (const t of teams) {
    if (topNames.has(t.name)) continue;
    const rem = getRemainingMatches(t.name, upcoming).length;
    maxFifth = Math.max(
      maxFifth,
      getMaximumPossiblePoints(t.points, rem)
    );
  }
  return maxFifth;
}

function resolveNrrPressure(
  teamNrr: number,
  fourthNrr: number,
  status: QualificationStatus
): NrrPressure {
  if (status === "eliminated" || status === "qualified") return "low";
  const gap = fourthNrr - teamNrr;
  if (gap <= 0) return "low";
  if (gap < 0.15) return "medium";
  return "high";
}

export function generateQualificationSummary(
  req: QualificationRequirements
): string[] {
  const { shortName, remainingMatches, requiredWins, status, nrrPressure } = req;
  const lines: string[] = [];

  if (status === "qualified") {
    lines.push(`${shortName} is in the projected playoff top 4.`);
    return lines;
  }

  if (status === "eliminated") {
    lines.push(
      `${shortName} is mathematically eliminated — cannot finish in the top four on points.`
    );
    return lines;
  }

  if (status === "mathematically_alive") {
    lines.push(
      `${shortName} remains mathematically alive for a playoff spot; odds depend on results and NRR.`
    );
  }

  if (status === "strong_favorite") {
    lines.push(`${shortName} is a strong playoff favorite in simulations.`);
  }

  if (remainingMatches > 0) {
    const marginSuffix = nrrPressure === "high" ? " (with high margin)" : "";
    lines.push(
      `${shortName} must win at least ${requiredWins} of remaining ${remainingMatches} match(es) to finish the league in the top 4${marginSuffix}.`
    );
  }

  if (nrrPressure === "high") {
    lines.push(`${shortName} likely needs significant NRR improvement alongside wins.`);
  } else if (nrrPressure === "medium") {
    lines.push(`${shortName} may need modest NRR gains depending on other results.`);
  }

  if (status === "must_win") {
    lines.push(`Next match is close to must-win territory for ${shortName}.`);
  }

  if (req.dependencies.length > 0) {
    lines.push(...req.dependencies);
  }

  return lines;
}

export function calculateQualificationRequirements(
  teamName: string,
  teams: TeamBaseline[],
  upcomingMatches: Match[],
  fullStandings: FullStandingsResult
): QualificationRequirements | null {
  const team = teams.find((t) => t.name === teamName);
  if (!team) return null;

  const projected = fullStandings.projected.standings;
  const row = projected.find((r) => r.name === teamName);
  const rank = row?.rank ?? 10;
  const fourth = fourthPlaceRow(projected);
  const remaining = getRemainingMatches(teamName, upcomingMatches);
  const maxPts = getMaximumPossiblePoints(team.points, remaining.length);

  // Calculate expected 4th place final points dynamically to see what's needed to finish in the top 4
  const expectedPointsList = teams.map((t) => {
    const rem = getRemainingMatches(t.name, upcomingMatches).length;
    return t.points + rem * 1.0;
  }).sort((a, b) => b - a);
  const expectedFourthPoints = expectedPointsList[PLAYOFF_SPOTS - 1] || 14;

  const gapToFourth = Math.max(0, expectedFourthPoints - team.points);
  const requiredWins = Math.min(
    remaining.length,
    Math.max(0, Math.ceil(gapToFourth / POINTS_PER_WIN))
  );

  const projectedQualified = !!row?.qualified;
  const fifthMax = fifthMaxPossiblePoints(projected, upcomingMatches, teams);

  let status: QualificationStatus;
  if (isMathematicallyEliminated(team, teams, upcomingMatches)) {
    status = "eliminated";
  } else if (projectedQualified && rank <= PLAYOFF_SPOTS) {
    status = "qualified";
  } else if (team.nrr < fourth.nrr - 0.1 && gapToFourth <= 2) {
    status = "nrr_battle";
  } else if (requiredWins <= 1 && maxPts >= fourth.points + 2) {
    status = "likely";
  } else if (maxPts <= fifthMax && gapToFourth > 0) {
    status = "must_win";
  } else {
    status = "mathematically_alive";
  }

  const nrrPressure = resolveNrrPressure(team.nrr, fourth.nrr, status);
  const shortName = getTeamShortName(teamName);

  const dependencies: string[] = [];
  if (remaining.length > 0) {
    const next = remaining[0];
    const opp = next.teamA === teamName ? next.teamB : next.teamA;
    dependencies.push(
      `${shortName} improves playoff chances with a win vs ${getTeamShortName(opp)} next.`
    );
  }

  const base: QualificationRequirements = {
    teamName,
    shortName,
    currentPoints: team.points,
    currentRank: rank,
    remainingMatches: remaining.length,
    maximumPossiblePoints: maxPts,
    requiredWins,
    pointsGapToFourth: gapToFourth,
    status,
    nrrPressure,
    summaries: [],
    dependencies,
    projectedQualified,
  };

  base.summaries = generateQualificationSummary(base);
  return base;
}
