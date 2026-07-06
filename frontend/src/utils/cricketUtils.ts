import type { ResultType } from "@/types/cricket";
import { T20_BALLS_PER_INNINGS } from "@/types/cricket";

export { T20_BALLS_PER_INNINGS };

export function oversToBalls(overs: number): number {
  const wholeOvers = Math.floor(overs);
  const ballPart = Math.round((overs - wholeOvers) * 10);
  const ballsInPartial = Math.min(5, Math.max(0, ballPart));
  return wholeOvers * 6 + ballsInPartial;
}

export function ballsToOvers(balls: number): number {
  const wholeOvers = Math.floor(balls / 6);
  const rem = balls % 6;
  return wholeOvers + rem / 10;
}

export function calculateRunRate(runs: number, ballsFaced: number): number {
  if (ballsFaced <= 0) return 0;
  return (runs / ballsFaced) * 6;
}

export function chaseBallsFaced(resultType: ResultType, margin: number): number {
  if (resultType === "chase_overs") return oversToBalls(margin);
  if (resultType === "balls_remaining") {
    return Math.max(1, T20_BALLS_PER_INNINGS - margin);
  }
  return T20_BALLS_PER_INNINGS;
}

export function normalizeResultType(marginType: string | undefined): ResultType {
  switch (marginType) {
    case "defended_runs":
    case "runs":
      return "defended_runs";
    case "chase_overs":
      return "chase_overs";
    case "balls_remaining":
    case "wickets":
      return "balls_remaining";
    default:
      return "defended_runs";
  }
}

export function normalizeMargin(
  marginType: string | undefined,
  margin: number
): number {
  if (marginType === "wickets") return Math.min(119, margin * 6);
  return margin;
}

export function formatResultSummary(
  marginType: string | undefined,
  margin: number,
  winnerShort: string,
  chaseRuns?: number
): string {
  const type = normalizeResultType(marginType);
  switch (type) {
    case "defended_runs":
      return `${winnerShort} defended by ${margin} runs`;
    case "chase_overs": {
      const balls = oversToBalls(margin);
      const overs = ballsToOvers(balls);
      const runs = chaseRuns ? ` (${chaseRuns} runs)` : "";
      return `${winnerShort} chased in ${overs.toFixed(1)} overs${runs}`;
    }
    case "balls_remaining":
      return `${winnerShort} won with ${margin} balls remaining`;
    default:
      return `${winnerShort} won`;
  }
}

export const RESULT_TYPE_LABELS: Record<ResultType, string> = {
  defended_runs: "Defended (runs)",
  chase_overs: "Chase (overs completed)",
  balls_remaining: "Chase (balls remaining)",
};
