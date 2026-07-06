export type ResultType = "defended_runs" | "chase_overs" | "balls_remaining";

export type LegacyResultType = "runs" | "wickets";

export type MarginType = ResultType | LegacyResultType;

export const T20_BALLS_PER_INNINGS = 120;

export interface MatchResultInput {
  resultType: ResultType;
  margin: number;
  chaseRuns?: number;
}
