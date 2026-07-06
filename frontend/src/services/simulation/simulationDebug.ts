/**
 * Development-only Monte Carlo debugging utilities.
 * Enable: NEXT_PUBLIC_SIM_DEBUG=true or setSimulationDebug(true) in browser console.
 */

import type { StandingsRow } from "@/types";
import type { PlayoffOutcomeCounts } from "./playoffClassification";

let debugEnabled =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_SIM_DEBUG === "true";

export function setSimulationDebug(enabled: boolean): void {
  debugEnabled = enabled;
}

export function isSimulationDebugEnabled(): boolean {
  return debugEnabled;
}

export function createQualificationCounter(): Map<string, PlayoffOutcomeCounts> {
  return new Map();
}

export function logSimulationSnapshot(
  iteration: number,
  standings: StandingsRow[],
  label = "standings"
): void {
  if (!debugEnabled) return;
  console.group(`[MC debug] ${label} — iteration ${iteration}`);
  console.table(
    standings.map((r) => ({
      rank: r.rank,
      team: r.shortName,
      pts: r.points,
      nrr: r.nrr.toFixed(3),
      Q: r.qualified ? "Y" : "",
    }))
  );
  console.groupEnd();
}

export function logQualificationPath(
  teamName: string,
  iteration: number,
  rank: number,
  madePlayoffs: boolean
): void {
  if (!debugEnabled) return;
  console.log(
    `[MC path] iter=${iteration} ${teamName} rank=${rank} playoff=${madePlayoffs}`
  );
}

export function dumpQualificationCounters(
  counters: Map<string, PlayoffOutcomeCounts>,
  iterations: number
): void {
  if (!debugEnabled) return;
  const rows = Array.from(counters.entries()).map(([name, c]) => ({
    team: name,
    playoff: `${((c.playoff / iterations) * 100).toFixed(1)}%`,
    top2: `${((c.topTwo / iterations) * 100).toFixed(1)}%`,
    out: `${((c.eliminated / iterations) * 100).toFixed(1)}%`,
  }));
  console.table(rows);
}
