import type { TeamBaseline, StandingsRow } from "@/types";

export interface MatchWinProbability {
  teamA: string;
  teamB: string;
  probabilityA: number;
  probabilityB: number;
}

/** Wider band than before — allows upsets but not pure chaos */
const MIN_PROB = 0.24;
const MAX_PROB = 0.76;

/** Blend weight: live table vs season baseline (reduces early-standings lock-in) */
const LIVE_STRENGTH_WEIGHT = 0.58;

export function calculateTeamStrength(
  team: TeamBaseline,
  standings: StandingsRow[]
): number {
  const rank = standings.find((r) => r.name === team.name)?.rank ?? 8;
  const winRate = team.played > 0 ? team.wins / team.played : 0.5;
  const pointsNorm = Math.min(1.2, team.points / 20);
  const nrrNorm = (team.nrr + 0.5) / 1.2;
  const rankNorm = (11 - rank) / 10;

  return (
    0.3 * pointsNorm +
    0.26 * winRate +
    0.24 * nrrNorm +
    0.2 * rankNorm
  );
}

function blendedStrength(
  live: TeamBaseline,
  baseline: TeamBaseline | undefined,
  standings: StandingsRow[]
): number {
  const liveS = calculateTeamStrength(live, standings);
  if (!baseline) return liveS;
  const baseS = calculateTeamStrength(baseline, standings);
  return LIVE_STRENGTH_WEIGHT * liveS + (1 - LIVE_STRENGTH_WEIGHT) * baseS;
}

/**
 * Weighted win probability from current simulation state + baseline.
 * Close points tables → compressed toward 50% (more upset paths).
 */
export function calculateMatchWinProbability(
  teamA: string,
  teamB: string,
  liveByName: Map<string, TeamBaseline>,
  standings: StandingsRow[],
  baselineByName?: Map<string, TeamBaseline>
): MatchWinProbability {
  const a = liveByName.get(teamA);
  const b = liveByName.get(teamB);

  if (!a || !b) {
    return { teamA, teamB, probabilityA: 0.5, probabilityB: 0.5 };
  }

  const strengthA = blendedStrength(
    a,
    baselineByName?.get(teamA),
    standings
  );
  const strengthB = blendedStrength(
    b,
    baselineByName?.get(teamB),
    standings
  );

  const total = strengthA + strengthB || 1;
  let probabilityA = strengthA / total;

  // Close race: increase variance / upset likelihood
  const pointsGap = Math.abs(a.points - b.points);
  if (pointsGap <= 2) {
    probabilityA = 0.5 + (probabilityA - 0.5) * 0.55;
  } else if (pointsGap <= 4) {
    probabilityA = 0.5 + (probabilityA - 0.5) * 0.72;
  }

  // Slight underdog boost so lower table teams retain comeback paths
  const rankA = standings.find((r) => r.name === teamA)?.rank ?? 5;
  const rankB = standings.find((r) => r.name === teamB)?.rank ?? 5;
  if (rankA > rankB && rankA >= 6) {
    probabilityA += 0.04;
  } else if (rankB > rankA && rankB >= 6) {
    probabilityA -= 0.04;
  }

  probabilityA = Math.max(MIN_PROB, Math.min(MAX_PROB, probabilityA));

  return {
    teamA,
    teamB,
    probabilityA,
    probabilityB: 1 - probabilityA,
  };
}
