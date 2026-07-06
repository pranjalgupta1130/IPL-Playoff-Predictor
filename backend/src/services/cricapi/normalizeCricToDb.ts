import type { CricApiCurrentMatchesItem, CricApiSeriesInfoItem } from "./types";
import type { IMatch } from "../../models/Match";
import type { ITeam } from "../../models/Team";

function parseDate(d: unknown): Date {
  if (!d) return new Date(0);
  const dt = new Date(String(d));
  return Number.isNaN(dt.getTime()) ? new Date(0) : dt;
}

function pickTeamName(item: any, which: "team1" | "team2"): string | null {
  const keys = which === "team1"
    ? ["team1", "team_1", "team1_name"]
    : ["team2", "team_2", "team2_name"];
  for (const k of keys) {
    const v = item?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function normalizeMatchStatus(status: unknown): "completed" | "live" | "upcoming" {
  const s = String(status ?? "").toLowerCase();
  if (s.includes("live") || s.includes("in progress") || s.includes("in-progress")) return "live";
  if (s.includes("complete") || s.includes("result") || s.includes("finished") || s.includes("won")) return "completed";
  return "upcoming";
}

function normalizeWinner(item: any, status: "completed" | "live" | "upcoming"): string | undefined {
  if (status !== "completed") return undefined;
  const w = item?.winner ?? item?.result;
  if (typeof w === "string" && w.trim()) return w.trim();
  return undefined;
}

export type NormalizeContext = {
  // existing canonical team names from DB (SEED_TEAMS or DB)
  canonicalTeams: ITeam[];
};

export function normalizeTeamsFromCric(seriesInfoTeams: string[]): string[] {
  // Keep as-is; later we map to canonical team names using string equality fallback.
  return seriesInfoTeams;
}

function mapToCanonicalTeam(name: string, canonicalTeams: ITeam[]): string {
  // Prefer exact string match to keep math consistent.
  const exact = canonicalTeams.find((t) => t.name === name);
  if (exact) return exact.name;

  // fallback: try shortName match (case-insensitive)
  const lower = name.toLowerCase();
  const byShort = canonicalTeams.find((t) => (t.shortName || "").toLowerCase() === lower);
  if (byShort) return byShort.name;

  // final fallback: keep the external name; this may break math if mismatch exists,
  // but we ensure canonical teams are seeded/created first in DB sync.
  return name;
}

export function normalizeMatchesFromCurrentMatches(
  items: CricApiCurrentMatchesItem[],
  ctx: NormalizeContext
): Array<Pick<IMatch, "teamA" | "teamB" | "date" | "venue" | "completed" | "winner" | "margin" | "marginType"> & { externalMatchId: string }>
{
  return items
    .map((it: any) => {
      const matchId = String(it.match_id ?? it.matchId ?? it.id ?? "");
      if (!matchId) return null;

      const team1 = pickTeamName(it, "team1");
      const team2 = pickTeamName(it, "team2");

      // Debug parsing (optional, controlled by CRICAPI_DEBUG=1)
      const debug = process.env.CRICAPI_DEBUG === "1";
      if (debug) {
        const raw = {
          match_id: it.match_id ?? it.matchId ?? it.id,
          status: it.status ?? it.matchStatus,
          rawTeamA: it?.team1 ?? it?.team_1 ?? it?.team1_name,
          rawTeamB: it?.team2 ?? it?.team_2 ?? it?.team2_name,
          pickedTeamA: team1,
          pickedTeamB: team2,
        };
        // eslint-disable-next-line no-console
        console.log("[CricAPI debug] normalizeMatchesFromCurrentMatches item:", raw);
      }

      if (!team1 || !team2) return null;

      const status = normalizeMatchStatus(it.status ?? it.matchStatus);
      const completed = status === "completed";
      const live = status === "live";
      if (live) {
        // keep as upcoming but marked not completed; simulation should ignore live unless treated completed.
      }

      return {
        externalMatchId: matchId,
        teamA: mapToCanonicalTeam(team1, ctx.canonicalTeams),
        teamB: mapToCanonicalTeam(team2, ctx.canonicalTeams),
        date: parseDate(it.date ?? it.startDate),
        venue: (it.venue && typeof it.venue === "string") ? it.venue : "",
        completed,
        winner: normalizeWinner(it, status),
        // margin + marginType will be filled later from match_scorecard if completed.
        margin: undefined,
        marginType: undefined,
      };
    })
    .filter(Boolean) as any;
}

export function normalizeMatchesFromSeriesInfo(
  items: CricApiSeriesInfoItem[],
  ctx: NormalizeContext
): Array<Pick<IMatch, "teamA" | "teamB" | "date" | "venue" | "completed" | "winner" | "margin" | "marginType"> & { externalMatchId: string }>
{
  return items
    .map((it: any) => {
      const matchId = String(it.match_id ?? it.matchId ?? it.id ?? "");
      if (!matchId) return null;

      const team1 = pickTeamName(it, "team1");
      const team2 = pickTeamName(it, "team2");

      // Debug parsing (optional, controlled by CRICAPI_DEBUG=1)
      const debug = process.env.CRICAPI_DEBUG === "1";
      if (debug) {
        const raw = {
          match_id: it.match_id ?? it.matchId ?? it.id,
          status: it.status ?? it.matchStatus,
          rawTeamA: it?.team1 ?? it?.team_1 ?? it?.team1_name,
          rawTeamB: it?.team2 ?? it?.team_2 ?? it?.team2_name,
          pickedTeamA: team1,
          pickedTeamB: team2,
        };
        // eslint-disable-next-line no-console
        console.log("[CricAPI debug] normalizeMatchesFromSeriesInfo item:", raw);
      }

      if (!team1 || !team2) return null;

      const status = normalizeMatchStatus(it.status ?? it.matchStatus);
      const completed = status === "completed";

      return {
        externalMatchId: matchId,
        teamA: mapToCanonicalTeam(team1, ctx.canonicalTeams),
        teamB: mapToCanonicalTeam(team2, ctx.canonicalTeams),
        date: parseDate(it.date ?? it.startDate),
        venue: (it.venue && typeof it.venue === "string") ? it.venue : "",
        completed,
        winner: normalizeWinner(it, status),
        margin: undefined,
        marginType: undefined,
      };
    })
    .filter(Boolean) as any;
}

