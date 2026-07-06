import { IPL_TEAM_SHORT_NAMES } from "../../../constants/teams";
import type { NormalizedFixture } from "../types/NormalizedFixture";

export type FixtureValidationResult = {
  rawCount: number;
  normalizedCount: number;
  invalidCount: number;
  duplicateRejectedCount: number;
  selfMatchRejectedCount: number;
  finalInsertedCount: number;
  /** Useful for debugging provider/normalization issues without silently corrupting DB */
  invalidReasons: Array<{ index: number; reason: string; fixture?: Partial<NormalizedFixture> }>;
  duplicateReasons: Array<{ index: number; key: string }>;
};

function isRecognizedIplTeam(name: string): boolean {
  const fullToShort = IPL_TEAM_SHORT_NAMES;
  if (fullToShort[name]) return true;

  const short = fullToShort[name];
  if (short) return true;

  // Also allow short-name inputs.
  return Object.values(fullToShort).includes(name);
}

function normalizeTeams(name: string): string {
  return String(name ?? "").trim();
}

function normalizeVenue(name: string): string {
  return String(name ?? "").trim();
}

function isValidDate(d: Date): boolean {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

function completedWinnerConsistency(f: NormalizedFixture): string | null {
  if (!f.completed) {
    if (f.winner) return "winner provided for non-completed fixture";
    return null;
  }
  // completed
  if (f.winner !== undefined && String(f.winner).trim().length === 0) return "winner is empty for completed fixture";
  return null;
}

export function validateAndSummarizeFixtures(
  normalized: NormalizedFixture[],
  opts: { maxFixtures?: number } = {}
): { valid: NormalizedFixture[]; summary: FixtureValidationResult } {
  const maxFixtures = opts.maxFixtures ?? 2000;

  const rawCount = normalized.length;

  const invalidReasons: FixtureValidationResult["invalidReasons"] = [];
  const duplicateReasons: FixtureValidationResult["duplicateReasons"] = [];

  const seenKeys = new Set<string>();
  const valid: NormalizedFixture[] = [];

  let selfMatchRejectedCount = 0;
  let duplicateRejectedCount = 0;

  for (let i = 0; i < normalized.length; i++) {
    const f = normalized[i];

    const teamA = normalizeTeams(f.teamA);
    const teamB = normalizeTeams(f.teamB);
    const venue = normalizeVenue(f.venue);
    const date = f.date instanceof Date ? f.date : new Date(f.date);

    const fixture: NormalizedFixture = {
      ...f,
      teamA,
      teamB,
      venue,
      date,
    };

    if (!fixture.teamA || !fixture.teamB) {
      invalidReasons.push({ index: i, reason: "missing teamA/teamB", fixture });
      continue;
    }

    if (fixture.teamA === fixture.teamB) {
      selfMatchRejectedCount++;
      invalidReasons.push({ index: i, reason: "self match rejected (teamA === teamB)", fixture });
      continue;
    }

    if (!isRecognizedIplTeam(fixture.teamA) || !isRecognizedIplTeam(fixture.teamB)) {
      invalidReasons.push({ index: i, reason: "unrecognized IPL team(s)", fixture });
      continue;
    }

    if (!isValidDate(fixture.date)) {
      invalidReasons.push({ index: i, reason: "invalid fixture date", fixture });
      continue;
    }

    // completed/upcoming status must already be boolean and consistent
    if (typeof fixture.completed !== "boolean") {
      invalidReasons.push({ index: i, reason: "completed flag is not boolean", fixture });
      continue;
    }

    const winnerProblem = completedWinnerConsistency(fixture);
    if (winnerProblem) {
      invalidReasons.push({ index: i, reason: winnerProblem, fixture });
      continue;
    }

    // Duplicate detection
    // Prefer confirmed provider fixtureId if present; otherwise fall back to (teamA, teamB, date)
    // Note: we do not guess fixtureId fields; if provider does not confirm, we won't use it.
    const dateIso = fixture.date.toISOString();
    const key = fixture.fixtureId
      ? `id:${fixture.fixtureId}`
      : `pair:${fixture.teamA}__${fixture.teamB}__${dateIso}`;

    if (seenKeys.has(key)) {
      duplicateRejectedCount++;
      duplicateReasons.push({ index: i, key });
      continue;
    }
    seenKeys.add(key);

    valid.push(fixture);

    if (valid.length >= maxFixtures) break;
  }

  const invalidCount = invalidReasons.length;

  const summary: FixtureValidationResult = {
    rawCount,
    normalizedCount: normalized.length,
    invalidCount,
    duplicateRejectedCount,
    selfMatchRejectedCount,
    finalInsertedCount: valid.length,
    invalidReasons,
    duplicateReasons,
  };

  return { valid, summary };
}

