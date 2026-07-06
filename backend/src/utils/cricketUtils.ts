import { ResultType, T20_BALLS_PER_INNINGS } from "../types/cricket";

/**
 * Convert cricket overs notation to balls (e.g. 17.3 → 105 balls).
 */
export function oversToBalls(overs: number): number {
  const wholeOvers = Math.floor(overs);
  const ballPart = Math.round((overs - wholeOvers) * 10);
  const ballsInPartial = Math.min(5, Math.max(0, ballPart));
  return wholeOvers * 6 + ballsInPartial;
}

/**
 * Convert balls to cricket overs notation (e.g. 105 → 17.3).
 */
export function ballsToOvers(balls: number): number {
  const wholeOvers = Math.floor(balls / 6);
  const rem = balls % 6;
  return wholeOvers + rem / 10;
}

/** Run rate = runs per over */
export function calculateRunRate(runs: number, ballsFaced: number): number {
  if (ballsFaced <= 0) return 0;
  return (runs / ballsFaced) * 6;
}

/** Balls faced in a successful chase */
export function chaseBallsFaced(resultType: ResultType, margin: number): number {
  if (resultType === "chase_overs") return oversToBalls(margin);
  if (resultType === "balls_remaining") {
    return Math.max(1, T20_BALLS_PER_INNINGS - margin);
  }
  return T20_BALLS_PER_INNINGS;
}

/** Normalize legacy DB values to current result types */
export function normalizeResultType(
  marginType: string | undefined
): ResultType {
  switch (marginType) {
    case "defended_runs":
    case "runs":
      return "defended_runs";
    case "chase_overs":
      return "chase_overs";
    case "balls_remaining":
      return "balls_remaining";
    case "wickets":
      // Legacy: treat as balls remaining (wickets * 6 approx)
      return "balls_remaining";
    default:
      return "defended_runs";
  }
}

/** Normalize legacy margin when converting wickets → balls */
export function normalizeMargin(
  marginType: string | undefined,
  margin: number
): number {
  if (marginType === "wickets") return Math.min(119, margin * 6);
  return margin;
}

export function formatResultSummary(
  resultType: ResultType,
  margin: number,
  winnerShort: string
): string {
  switch (resultType) {
    case "defended_runs":
      return `${winnerShort} won by ${margin} runs`;
    case "chase_overs":
      return `${winnerShort} chased in ${ballsToOvers(oversToBalls(margin)).toFixed(1)} overs`;
    case "balls_remaining":
      return `${winnerShort} won with ${margin} balls remaining`;
    default:
      return `${winnerShort} won`;
  }
}
