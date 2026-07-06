import { MatchResultInput, ResultType } from "../types/cricket";
import {
  calculateRunRate,
  chaseBallsFaced,
  normalizeMargin,
  normalizeResultType,
} from "./cricketUtils";

const RUNS_DEFENDED_FACTOR = 0.002;
const LOSS_MULTIPLIER = 0.85;
const LEAGUE_AVG_RUN_RATE = 8.0;
const CHASE_RR_WEIGHT = 0.028;
const DEFAULT_CHASE_RUNS = 172;

/**
 * NRR delta from match result (modular — swap for official IPL formula later).
 */
export function calculateNrrDelta(
  margin: number,
  marginType: string | undefined,
  isWinner: boolean,
  chaseRuns?: number
): number {
  const resultType = normalizeResultType(marginType);
  const normalizedMargin = normalizeMargin(marginType, margin);

  if (resultType === "defended_runs") {
    const base = normalizedMargin * RUNS_DEFENDED_FACTOR;
    const delta = isWinner ? base : -base * LOSS_MULTIPLIER;
    return round3(delta);
  }

  // Chase wins: rate depends on overs/balls consumed, not wickets
  const balls = chaseBallsFaced(resultType, normalizedMargin);
  const runs = chaseRuns ?? DEFAULT_CHASE_RUNS;
  const chaseRR = calculateRunRate(runs, balls);
  const efficiency = (chaseRR - LEAGUE_AVG_RUN_RATE) * CHASE_RR_WEIGHT;
  const delta = isWinner ? efficiency : -efficiency * LOSS_MULTIPLIER;
  return round3(delta);
}

export function calculateNrrDeltaFromInput(
  input: MatchResultInput,
  isWinner: boolean
): number {
  return calculateNrrDelta(
    input.margin,
    input.resultType,
    isWinner,
    input.chaseRuns
  );
}

/** Apply delta to current NRR */
export function recalculateNrr(currentNrr: number, delta: number): number {
  return round3(currentNrr + delta);
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** @deprecated */
export const applyNrr = recalculateNrr;
