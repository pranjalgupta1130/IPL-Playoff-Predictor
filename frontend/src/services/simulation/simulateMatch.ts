import { applyMatchResult, rowsFromSnapshot } from "@/services/standingsEngine";
import { calculateMatchWinProbability } from "@/services/simulation/matchWinProbability";
import { sortStandings } from "@/services/standingsEngine";
import type { Match, TeamBaseline} from "@/types";
import type { ResultType } from "@/types/cricket";

type TeamSnapshot = TeamBaseline & { name: string; shortName: string };

/** Build live team map from snapshot (fixes stale baseline-only strength bug) */
function liveTeamsFromSnapshot(
  snapshot: Map<string, TeamSnapshot>
): Map<string, TeamBaseline> {
  const map = new Map<string, TeamBaseline>();
  snapshot.forEach((row) => {
    map.set(row.name, row);
  });
  return map;
}

/**
 * Simulate one unresolved fixture using current table state (not frozen baseline).
 */
export function simulateMatch(
  snapshot: Map<string, TeamSnapshot>,
  match: Match,
  baselineByName: Map<string, TeamBaseline> | undefined,
  rng: () => number
): void {
  const standings = sortStandings(rowsFromSnapshot(snapshot));
  const liveByName = liveTeamsFromSnapshot(snapshot);

  const { probabilityA } = calculateMatchWinProbability(
    match.teamA,
    match.teamB,
    liveByName,
    standings,
    baselineByName
  );

  const winner = rng() < probabilityA ? match.teamA : match.teamB;

  const isChase = rng() < 0.55;
  let marginType: ResultType;
  let margin: number;
  let chaseRuns: number | undefined;

  if (isChase) {
    marginType = rng() < 0.5 ? "chase_overs" : "balls_remaining";
    if (marginType === "chase_overs") {
      const whole = 14 + Math.floor(rng() * 5);
      const balls = Math.floor(rng() * 6);
      margin = whole + balls / 10;
    } else {
      margin = 8 + Math.floor(rng() * 35);
    }
    chaseRuns = 155 + Math.floor(rng() * 45);
  } else {
    marginType = "defended_runs";
    margin = 4 + Math.floor(rng() * 32);
  }

  applyMatchResult(
    snapshot,
    match.teamA,
    match.teamB,
    winner,
    margin,
    marginType,
    chaseRuns
  );
}
