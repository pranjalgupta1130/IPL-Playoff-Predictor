// Provider normalization into the existing Match model fields.
// This keeps analytics engine unchanged.

import type { SportmonksFixturesResponse } from "../sportmonksTypes";

function parseDate(d: unknown): Date {
  const dt = new Date(String(d ?? ""));
  return Number.isNaN(dt.getTime()) ? new Date(0) : dt;
}

function pickString(obj: any, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

export function normalizeSportmonksFixturesToMatches(
  resp: SportmonksFixturesResponse
): Array<{
  /**
   * Sportmonks fixtureId field is not confirmed in this codebase.
   * IMPORTANT: do not guess provider response identifiers.
   */
  fixtureId?: string;
  teamA: string;
  teamB: string;
  date: Date;
  venue: string;
  completed: boolean;
  winner?: string;
}> {
  const items = Array.isArray(resp?.data) ? (resp.data as any[]) : [];

  return items
    .map((it: any) => {
      // Sportmonks varies field names; normalize with common candidates.
      const team1 = pickString(it, ["team1_name", "team1Name", "team1", "localteam_name", "localTeamName"]);
      const team2 = pickString(it, ["team2_name", "team2Name", "team2", "awayteam_name", "awayTeamName"]);

      const start = it?.starting_at || it?.startDate || it?.date || it?.match_date;
      const date = parseDate(start);

      const venue = pickString(it, ["venue", "ground", "venue_name", "stadium"] ) || "";

      const status = String(it?.status || it?.match_status || "").toLowerCase();
      const completed = status.includes("completed") || status.includes("full_time") || status.includes("finished");

      const winner =
        typeof it?.winner === "string"
          ? it.winner
          : typeof it?.result === "string"
            ? it.result
            : undefined;

      if (!team1 || !team2) return null;
      if (Number.isNaN(date.getTime()) || team1 === team2) return null;

      return {
        // No fixtureId extraction: not confirmed by existing codebase.
        fixtureId: undefined,
        teamA: team1,
        teamB: team2,
        date,
        venue,
        completed,
        winner,
      };
    })
    .filter(Boolean) as any;
}


