import type { Match, Prediction, TeamBaseline } from "@/types";

/** Cache key for Monte Carlo — invalidate when baseline or predictions change */
export function buildMonteCarloCacheKey(
  teams: TeamBaseline[],
  upcoming: Match[],
  predictions: Prediction[],
  iterations: number
): string {
  const teamSig = teams
    .map((t) => `${t.name}:${t.points}:${t.nrr}:${t.played}`)
    .sort()
    .join("|");
  const matchSig = upcoming.map((m) => m._id).sort().join(",");
  const predSig = predictions
    .map((p) => {
      const id = typeof p.matchId === "string" ? p.matchId : p.matchId._id;
      return `${id}:${p.predictedWinner}:${p.margin}:${p.marginType}`;
    })
    .sort()
    .join("|");
  return `${teamSig}::${matchSig}::${predSig}::${iterations}`;
}
