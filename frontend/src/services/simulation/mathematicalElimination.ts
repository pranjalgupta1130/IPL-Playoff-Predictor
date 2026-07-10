import { PLAYOFF_SPOTS} from "@/constants/tournament";
import type { Match, TeamBaseline } from "@/types";
import { getMaximumPossiblePoints } from "@/utils/tournamentMath";

export interface EliminationAnalysis {
  eliminated: boolean;
  reason?: string;
  maxPossiblePoints: number;
  teamsAlreadyAheadOnPoints: number;
  teamsWithHigherMaxPoints: number;
  canReachTopFourOnMaxPoints: boolean;
}

export function countRemainingMatches(
  teamName: string,
  upcoming: Match[]
): number {
  return upcoming.filter(
    (m) => m.teamA === teamName || m.teamB === teamName
  ).length;
}

/**
 * True only when team cannot finish in top PLAYOFF_SPOTS on points in any scenario.
 * NRR ties: if a points path exists, team stays "mathematically alive" (NRR can swing).
 */
export function isMathematicallyEliminated(
  team: TeamBaseline,
  allTeams: TeamBaseline[],
  upcomingMatches: Match[]
): boolean {
  return analyzeMathematicalElimination(team, allTeams, upcomingMatches)
    .eliminated;
}

export function analyzeMathematicalElimination(
  team: TeamBaseline,
  allTeams: TeamBaseline[],
  upcomingMatches: Match[]
): EliminationAnalysis {
  const remaining = countRemainingMatches(team.name, upcomingMatches);
  const maxPossiblePoints = getMaximumPossiblePoints(team.points, remaining);

  // 4+ teams already have more points than T can ever reach
  let teamsAlreadyAheadOnPoints = 0;
  for (const other of allTeams) {
    if (other.name === team.name) continue;
    if (other.points > maxPossiblePoints) teamsAlreadyAheadOnPoints++;
  }

  if (teamsAlreadyAheadOnPoints >= PLAYOFF_SPOTS) {
    return {
      eliminated: true,
      reason: `${PLAYOFF_SPOTS} teams already exceed this team's maximum possible points`,
      maxPossiblePoints,
      teamsAlreadyAheadOnPoints,
      teamsWithHigherMaxPoints: teamsAlreadyAheadOnPoints,
      canReachTopFourOnMaxPoints: false,
    };
  }

  // If team wins out, where do they sit on max-points table?
  const maxPointsTable = allTeams
    .map((t) => ({
      name: t.name,
      max: getMaximumPossiblePoints(
        t.points,
        countRemainingMatches(t.name, upcomingMatches)
      ),
    }))
    .sort((a, b) => b.max - a.max);

  const rankByMaxPts =
    maxPointsTable.findIndex((r) => r.name === team.name) + 1;
  const canReachTopFourOnMaxPoints = rankByMaxPts <= PLAYOFF_SPOTS;

  const teamsWithHigherMaxPoints = maxPointsTable.filter(
    (r) => r.name !== team.name && r.max > maxPossiblePoints
  ).length;

  // Eliminated if 4+ teams can strictly exceed T's ceiling on points (win-out table)
  if (teamsWithHigherMaxPoints >= PLAYOFF_SPOTS) {
    return {
      eliminated: true,
      reason: `${PLAYOFF_SPOTS}+ teams can finish above this team's best possible points total`,
      maxPossiblePoints,
      teamsAlreadyAheadOnPoints,
      teamsWithHigherMaxPoints,
      canReachTopFourOnMaxPoints: false,
    };
  }

  return {
    eliminated: false,
    maxPossiblePoints,
    teamsAlreadyAheadOnPoints,
    teamsWithHigherMaxPoints,
    canReachTopFourOnMaxPoints,
  };
}

/**
 * Clinched: even losing every remaining match, still guaranteed top 4 on points.
 * (Rare mid-season; conservative check.)
 */
export function isMathematicallyQualified(
  team: TeamBaseline,
  allTeams: TeamBaseline[],
  upcomingMatches: Match[]
): boolean {
  const minPoints = team.points; // lose all remaining
  let teamsThatCanPass = 0;

  for (const other of allTeams) {
    if (other.name === team.name) continue;
    const otherMax = getMaximumPossiblePoints(
      other.points,
      countRemainingMatches(other.name, upcomingMatches)
    );
    if (otherMax > minPoints) teamsThatCanPass++;
  }

  // Fewer than PLAYOFF_SPOTS teams can ever pass this team's floor → clinched on points
  return teamsThatCanPass < PLAYOFF_SPOTS;
}
