import { ITeam } from "../../models/Team";
import { StandingsRow } from "../standingsService";

const MIN_PROB = 0.24;
const MAX_PROB = 0.76;
const LIVE_STRENGTH_WEIGHT = 0.58;

function calculateTeamStrength(team: ITeam, standings: StandingsRow[]): number {
  const rank = standings.find((r) => r.name === team.name)?.rank ?? 8;
  const winRate = team.played > 0 ? team.wins / team.played : 0.5;
  const pointsNorm = Math.min(1.2, team.points / 20);
  const nrrNorm = (team.nrr + 0.5) / 1.2;
  const rankNorm = (11 - rank) / 10;
  return 0.3 * pointsNorm + 0.26 * winRate + 0.24 * nrrNorm + 0.2 * rankNorm;
}

export function calculateMatchWinProbability(
  teamA: string,
  teamB: string,
  liveByName: Map<string, ITeam>,
  standings: StandingsRow[],
  baselineByName?: Map<string, ITeam>
): { probabilityA: number; probabilityB: number } {
  const a = liveByName.get(teamA);
  const b = liveByName.get(teamB);
  if (!a || !b) return { probabilityA: 0.5, probabilityB: 0.5 };

  const liveA = calculateTeamStrength(a, standings);
  const liveB = calculateTeamStrength(b, standings);
  const baseA = baselineByName?.get(teamA);
  const baseB = baselineByName?.get(teamB);
  const strengthA = baseA
    ? LIVE_STRENGTH_WEIGHT * liveA + (1 - LIVE_STRENGTH_WEIGHT) * calculateTeamStrength(baseA, standings)
    : liveA;
  const strengthB = baseB
    ? LIVE_STRENGTH_WEIGHT * liveB + (1 - LIVE_STRENGTH_WEIGHT) * calculateTeamStrength(baseB, standings)
    : liveB;

  const total = strengthA + strengthB || 1;
  let probabilityA = strengthA / total;
  const pointsGap = Math.abs(a.points - b.points);
  if (pointsGap <= 2) probabilityA = 0.5 + (probabilityA - 0.5) * 0.55;
  else if (pointsGap <= 4) probabilityA = 0.5 + (probabilityA - 0.5) * 0.72;

  probabilityA = Math.max(MIN_PROB, Math.min(MAX_PROB, probabilityA));
  return { probabilityA, probabilityB: 1 - probabilityA };
}
