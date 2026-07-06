/** How a match was won — used for NRR and display (not wickets) */
export type ResultType = "defended_runs" | "chase_overs" | "balls_remaining";

/** Legacy margin types stored in older records */
export type LegacyResultType = "runs" | "wickets";

export const T20_BALLS_PER_INNINGS = 120;

export interface MatchResultInput {
  resultType: ResultType;
  margin: number;
  /** Runs scored in chase (optional; estimated if omitted) */
  chaseRuns?: number;
}
