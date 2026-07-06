import { Team } from "../../models/Team";
import { Match } from "../../models/Match";
import { SEED_TEAMS } from "../../data/seedData";
import { cricApiClient } from "./cricApiClient";
import type { CricApiSeriesItem } from "./types";
import { normalizeMatchesFromCurrentMatches, normalizeMatchesFromSeriesInfo } from "./normalizeCricToDb";

function envOr<T>(value: T | undefined | null, fallback: T): T {
  return value === undefined || value === null ? fallback : value;
}

async function upsertTeamsFromSeed(): Promise<void> {
  // Team naming must exactly match Match.teamA/teamB for elimination logic.
  // So we keep canonical team names from seed.
  await Team.deleteMany({});
  await Team.insertMany(SEED_TEAMS as any);
}

function extractSeriesId(seriesItems: CricApiSeriesItem[], seasonHint = "IPL 2026"): string | number | null {
  // Deterministic heuristic: choose the first series with name containing the hint.
  const hit = seriesItems.find((s) => String(s.name ?? s.seriesName ?? "").toLowerCase().includes(seasonHint.toLowerCase()));
  return (hit?.id ?? hit?.series_id ?? hit?.seriesId ?? null) as any;
}

export async function syncCricFixturesToMongo(): Promise<void> {
  // If CRICAPI_KEY not set: only allow seed fixtures in DEV mode.
  const mode = process.env.NODE_ENV || "development";
  const isDev = mode !== "production";

  if (!process.env.CRICAPI_KEY) {
    if (!isDev) {
      throw new Error("CRICAPI_KEY missing in production: refusing to use synthetic seed fixtures.");
    }

    // In dev, we still want fixtures to exist; this preserves baseline simulation working without CricAPI.
    console.warn("[CricAPI] CRICAPI_KEY missing; using local fixture seed (dev fallback). Set CRICAPI_KEY to use real fixtures.");
    await upsertTeamsFromSeed();
    // Keep existing behavior (seed fixtures already inserted by seed.ts), so just exit.
    return;
  }

  await upsertTeamsFromSeed();


  // 1) Identify series/tournament id dynamically.
  const seriesResp = await cricApiClient.getSeries();
  const seriesItems = Array.isArray((seriesResp as any)?.data) ? (seriesResp as any).data : (seriesResp as any);
  const seriesId = extractSeriesId(seriesItems, "IPL 2026");

  // fallback: still call series_info if we can.
  const canonicalTeams = await Team.find().lean();

  // 2) Pull fixture list.
  let seriesInfoItems: any[] = [];
  if (seriesId) {
    const seriesInfoResp = await cricApiClient.getSeriesInfo(seriesId);
    seriesInfoItems = Array.isArray((seriesInfoResp as any)?.data) ? (seriesInfoResp as any).data : (seriesInfoResp as any);
  }

  // 3) Pull current/recent matches if series_info is absent.
  let currentItems: any[] = [];
  const currentResp = await cricApiClient.getCurrentMatches(String(seriesId ?? ""));
  currentItems = Array.isArray((currentResp as any)?.data) ? (currentResp as any).data : (currentResp as any);

  const normalized = [
    ...(seriesInfoItems.length
      ? normalizeMatchesFromSeriesInfo(seriesInfoItems, { canonicalTeams: canonicalTeams as any })
      : []),
    ...(!seriesInfoItems.length
      ? normalizeMatchesFromCurrentMatches(currentItems, { canonicalTeams: canonicalTeams as any })
      : []),
  ];

  const debug = process.env.CRICAPI_DEBUG === "1";
  if (debug) {
    // eslint-disable-next-line no-console
    console.log("[CricAPI debug] seriesId:", seriesId);
    // eslint-disable-next-line no-console
    console.log("[CricAPI debug] raw seriesInfoItems sample:", (seriesInfoItems as any[]).slice(0, 2));
    // eslint-disable-next-line no-console
    console.log("[CricAPI debug] raw currentItems sample:", (currentItems as any[]).slice(0, 2));
    // eslint-disable-next-line no-console
    console.log("[CricAPI debug] normalized sample:", normalized.slice(0, 5));
    const selfMatches = normalized.filter((m: any) => (m.teamA ?? "") === (m.teamB ?? "")).length;
    // eslint-disable-next-line no-console
    console.log("[CricAPI debug] self-match detection count:", selfMatches);
  }

  if (!normalized.length) {
    // fallback: keep whatever seed matches exist.
    return;
  }

  // 4) Replace Match collection with normalized fixture state.
  // IMPORTANT: do not merge with any previously seeded/synthetic fixtures.
  await Match.deleteMany({});

  // Validation + insertion.
  // - no self matches
  // - no invalid/empty opponents
  // - de-duplicate by (teamA, teamB, date)
  const seenKeys = new Set<string>();
  const docs = normalized
    .map((m) => {
      const completed = !!m.completed;
      const teamA = (m.teamA ?? "").trim();
      const teamB = (m.teamB ?? "").trim();
      const date = m.date instanceof Date ? m.date : new Date(m.date);
      const venue = (m.venue ?? "").trim();

      return {
        teamA,
        teamB,
        date,
        venue,
        completed,
        winner: completed ? (m.winner ?? "") : undefined,
      };
    })
    .filter((m) => {
      if (!m.teamA || !m.teamB) return false;
      if (m.teamA === m.teamB) return false;
      if (Number.isNaN(m.date.getTime())) return false;
      return true;
    })
    .filter((m) => {
      const key = `${m.teamA}__${m.teamB}__${m.date.toISOString()}`;
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    })
    .map((m) => ({
      teamA: m.teamA,
      teamB: m.teamB,
      date: m.date,
      venue: m.venue || "",
      completed: m.completed,
      winner: m.completed ? (m.winner ?? "") : undefined,
      margin: undefined,
      marginType: undefined,
    }))
    .slice(0, 2000);

  if (!docs.length) {
    throw new Error("CricAPI normalization produced 0 valid fixtures after validation.");
  }

  await Match.insertMany(docs as any);

}

