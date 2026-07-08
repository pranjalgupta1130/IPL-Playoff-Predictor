import { PLAYOFF_SPOTS, TOP_TWO_SPOTS } from "@/constants/tournament";
import type { StandingsRow } from "@/types";

export interface PlayoffOutcomeCounts {
  playoff: number;
  topTwo: number;
  eliminated: number;
}

/**
 * Classify final rank after sort (points → NRR).
 * rank is 1-based (1 = first place).
 */
export function classifyByRank(rank: number): {
  madePlayoffs: boolean;
  madeTopTwo: boolean;
  eliminated: boolean;
} {
  return {
    madePlayoffs: rank <= PLAYOFF_SPOTS,
    madeTopTwo: rank <= TOP_TWO_SPOTS,
    eliminated: rank > PLAYOFF_SPOTS,
  };
}

/**
 * Record outcomes from a sorted standings table.
 * Uses row.rank when set; otherwise index + 1 (0-based array from sortStandings).
 */
export function recordPlayoffOutcomes(
  counters: Map<string, PlayoffOutcomeCounts>,
  sortedStandings: StandingsRow[]
): void {
  sortedStandings.forEach((row, index) => {
    const rank = row.rank ?? index + 1;
    const { madePlayoffs, madeTopTwo, eliminated } = classifyByRank(rank);
    const c = counters.get(row.name);
    if (!c) return;
    if (madePlayoffs) c.playoff += 1;
    if (madeTopTwo) c.topTwo += 1;
    if (eliminated) c.eliminated += 1;
  });
}

export function createOutcomeCounters(
  teamNames: string[]
): Map<string, PlayoffOutcomeCounts> {
  const map = new Map<string, PlayoffOutcomeCounts>();
  for (const name of teamNames) {
    map.set(name, { playoff: 0, topTwo: 0, eliminated: 0 });
  }
  return map;
}

/** Audit helper: playoff + eliminated should equal iterations per team */
export function validateOutcomeTotals(
  counters: Map<string, PlayoffOutcomeCounts>,
  iterations: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  counters.forEach((c, name) => {
    if (c.playoff + c.eliminated !== iterations) {
      errors.push(
        `${name}: playoff(${c.playoff}) + eliminated(${c.eliminated}) !== ${iterations}`
      );
    }
    if (c.topTwo > c.playoff) {
      errors.push(`${name}: topTwo > playoff`);
    }
  });
  return { valid: errors.length === 0, errors };
}
