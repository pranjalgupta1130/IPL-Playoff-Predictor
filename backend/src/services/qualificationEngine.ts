import { IMatch } from "../models/Match";
import { ITeam } from "../models/Team";
import { IPrediction } from "../models/Prediction";
import { getTeamShortName } from "../constants/teams";
import {
  FullStandingsResult,
  StandingsRow,
} from "./standingsService";

const POINTS_PER_WIN = 2;
const PLAYOFF_SPOTS = 4;

export type QualificationStatus =
  | "qualified"
  | "likely"
  | "in_contention"
  | "must_win"
  | "nrr_battle"
  | "eliminated";

export type NrrPressure = "low" | "medium" | "high";

export interface QualificationRequirements {
  teamName: string;
  shortName: string;
  currentPoints: number;
  currentRank: number;
  remainingMatches: number;
  maximumPossiblePoints: number;
  requiredWins: number;
  pointsGapToFourth: number;
  status: QualificationStatus;
  nrrPressure: NrrPressure;
  summaries: string[];
  dependencies: string[];
  projectedQualified: boolean;
}

export function getMaximumPossiblePoints(
  currentPoints: number,
  remainingMatches: number
): number {
  return currentPoints + remainingMatches * POINTS_PER_WIN;
}

function getRemainingMatches(teamName: string, upcoming: IMatch[]): IMatch[] {
  return upcoming.filter((m) => m.teamA === teamName || m.teamB === teamName);
}

function fourthPlaceRow(projected: StandingsRow[]): StandingsRow {
  return projected[Math.min(PLAYOFF_SPOTS - 1, projected.length - 1)];
}

function fifthMaxPossiblePoints(
  projected: StandingsRow[],
  upcoming: IMatch[],
  teams: ITeam[]
): number {
  const topNames = new Set(projected.slice(0, PLAYOFF_SPOTS).map((r) => r.name));
  let maxFifth = 0;
  for (const t of teams) {
    if (topNames.has(t.name)) continue;
    const rem = getRemainingMatches(t.name, upcoming).length;
    const maxPts = getMaximumPossiblePoints(t.points, rem);
    maxFifth = Math.max(maxFifth, maxPts);
  }
  return maxFifth;
}

function scheduleDifficulty(
  teamName: string,
  upcoming: IMatch[],
  standings: StandingsRow[]
): number {
  const remaining = getRemainingMatches(teamName, upcoming);
  if (remaining.length === 0) return 0;
  const pointsByTeam = new Map(standings.map((r) => [r.name, r.points]));
  const oppPoints = remaining.map((m) => {
    const opp = m.teamA === teamName ? m.teamB : m.teamA;
    return pointsByTeam.get(opp) ?? 10;
  });
  const avg = oppPoints.reduce((a, b) => a + b, 0) / oppPoints.length;
  return Math.min(1, avg / 16);
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
  req: QualificationRequirements,
  shortName: string
): string[] {
  const lines: string[] = [];
  const { remainingMatches, requiredWins, status, nrrPressure } = req;

  if (status === "qualified") {
    lines.push(`${shortName} is in the projected playoff top 4.`);
    return lines;
  }

  if (status === "eliminated") {
    lines.push(
      `${shortName} cannot reach the playoff zone even with maximum points from remaining games.`
    );
    return lines;
  }

  if (remainingMatches > 0) {
    lines.push(
      `${shortName} must win at least ${requiredWins} of remaining ${remainingMatches} match(es) to stay in contention.`
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
    lines.push(req.dependencies[0]);
  }

  return lines;
}

export function calculateQualificationRequirements(
  teamName: string,
  teams: ITeam[],
  upcomingMatches: IMatch[],
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
  const gapToFourth = fourth.points - team.points;
  const requiredWins = Math.min(
    remaining.length,
    Math.max(0, Math.ceil(gapToFourth / POINTS_PER_WIN))
  );

  const projectedQualified = !!row?.qualified;
  const fifthMax = fifthMaxPossiblePoints(projected, upcomingMatches, teams);

  let status: QualificationStatus;
  if (projectedQualified && rank <= PLAYOFF_SPOTS) {
    status = "qualified";
  } else if (maxPts < fourth.points) {
    status = "eliminated";
  } else if (maxPts <= fifthMax && gapToFourth > 0) {
    status = "must_win";
  } else if (team.nrr < fourth.nrr - 0.1 && gapToFourth <= 2) {
    status = "nrr_battle";
  } else if (requiredWins <= 1 && maxPts >= fourth.points + 2) {
    status = "likely";
  } else {
    status = "in_contention";
  }

  const nrrPressure = resolveNrrPressure(team.nrr, fourth.nrr, status);
  const shortName = getTeamShortName(teamName);

  const dependencies: string[] = [];
  if (remaining.length > 0) {
    const next = remaining[0];
    const opp = next.teamA === teamName ? next.teamB : next.teamA;
    dependencies.push(
      `${shortName} qualifies sooner if they beat ${getTeamShortName(opp)} in the next fixture.`
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

  base.summaries = generateQualificationSummary(base, shortName);
  return base;
}
