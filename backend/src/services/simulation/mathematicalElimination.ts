import { PLAYOFF_SPOTS, POINTS_PER_WIN } from "../../constants/tournament";
import { IMatch } from "../../models/Match";
import { ITeam } from "../../models/Team";



export type MathematicalStatus = {
  mathematicallyEliminated: boolean;
  mathematicallyQualified: boolean;
};

/**
 * Helper: determine mathematically feasible Top-4 placement using exact winner combinations.
 *
 * NOTE on ties / NRR policy (conservative):
 * - We only use points totals. NRR is unknown for remaining matches.
 * - For feasibility, if a team can reach a point total that is compatible with finishing Top-4
 *   under points-only ordering, we treat it as feasible.
 * - For elimination/qualification, we conservatively treat point ties as NOT preventing feasibility.
 *   This avoids false eliminations caused by unknown future NRR.
 */
export function analyzeMathematicalStatus(
  teams: ITeam[],
  upcomingMatches: IMatch[]
): Map<string, MathematicalStatus> {
  // Defensive invariants for Match-50 universe.
  if (!Array.isArray(teams) || teams.length !== 10) {
    throw new Error(`analyzeMathematicalStatus expected teams.length===10, got ${teams.length}`);
  }
  if (!Array.isArray(upcomingMatches) || upcomingMatches.length !== 20) {
    throw new Error(
      `analyzeMathematicalStatus expected upcomingMatches.length===20, got ${upcomingMatches.length}`
    );
  }

  const teamIndex = new Map<string, number>();
  teams.forEach((t, i) => teamIndex.set(t.name, i));

  // Points-only snapshot, updated in-place.
  const basePoints = teams.map((t) => t.points);
  const points = [...basePoints];

  const canFinishTopFour = new Array<boolean>(teams.length).fill(false);
  const canFinishOutsideTopFour = new Array<boolean>(teams.length).fill(false);

  // Precompute match team indices.
  const matchPairs = upcomingMatches.map((m) => {
    const a = teamIndex.get(m.teamA);
    const b = teamIndex.get(m.teamB);
    if (a == null || b == null) {
      throw new Error(`Upcoming match contains unknown teams: ${m.teamA} vs ${m.teamB}`);
    }
    return [a, b] as const;
  });

  // Points-only top-4 feasibility for a given end points array.
  // Conservative tie handling: if points-only ordering produces a tie at the boundary,
  // we assume the team could be placed within the top four depending on unknown NRR.
  function isTeamInTopFourByPoints(pointsArr: number[], teamIdx: number): boolean {
    const myPts = pointsArr[teamIdx];
    // Count teams strictly above my points.
    let strictlyAbove = 0;
    let equalCount = 0;
    for (let i = 0; i < pointsArr.length; i++) {
      if (i === teamIdx) continue;
      if (pointsArr[i] > myPts) strictlyAbove++;
      if (pointsArr[i] === myPts) equalCount++;
    }

    if (strictlyAbove > PLAYOFF_SPOTS - 1) return false;

    // If we're not strictly outside the cut line, conservative assumption that ties can swing.
    return true;
  }

  // Iterate all 2^20 combinations using DFS with in-place updates.
  // Complexity ~1,048,576 leaves; leaf evaluation O(10^2) is fine.
  let scenarios = 0;
  const remainingMatchesCount = matchPairs.length;

  function dfs(matchIdx: number): void {
    if (matchIdx === remainingMatchesCount) {
      scenarios++;
      // Evaluate all teams for this outcome.
      for (let t = 0; t < teams.length; t++) {
        const inTopFour = isTeamInTopFourByPoints(points, t);
        if (inTopFour) canFinishTopFour[t] = true;
        else canFinishOutsideTopFour[t] = true;
      }
      return;
    }

    const [a, b] = matchPairs[matchIdx];

    // Winner = a
    points[a] += POINTS_PER_WIN;
    dfs(matchIdx + 1);
    points[a] -= POINTS_PER_WIN;

    // Winner = b
    points[b] += POINTS_PER_WIN;
    dfs(matchIdx + 1);
    points[b] -= POINTS_PER_WIN;
  }

  dfs(0);

  const result = new Map<string, MathematicalStatus>();
  teams.forEach((t, i) => {
    result.set(t.name, {
      mathematicallyEliminated: !canFinishTopFour[i],
      mathematicallyQualified: !canFinishOutsideTopFour[i],
    });
  });

  // Optional debug: uncomment to log enumeration size.
  // console.log(`[math] evaluated ${scenarios} scenarios`);

  return result;
}

export function isMathematicallyEliminated(
  team: ITeam,
  allTeams: ITeam[],
  upcomingMatches: IMatch[]
): boolean {
  return analyzeMathematicalStatus(allTeams, upcomingMatches).get(team.name)!
    .mathematicallyEliminated;
}

export function isMathematicallyQualified(
  team: ITeam,
  allTeams: ITeam[],
  upcomingMatches: IMatch[]
): boolean {
  return analyzeMathematicalStatus(allTeams, upcomingMatches).get(team.name)!
    .mathematicallyQualified;
}

