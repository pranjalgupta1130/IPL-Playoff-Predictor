import type { CricApiResponse } from "./types";
import { getCache, setCache } from "./cache";

const BASE_URL = process.env.CRICAPI_BASE_URL || "https://api.cricapi.com/v1";
const KEY = process.env.CRICAPI_KEY;

if (!KEY) {
  // Do not throw during import; allow fallback to seed.
  console.warn("[CricAPI] CRICAPI_KEY not set; CricAPI integration will fallback to seed data.");
}

async function fetchJson<T>(path: string, params: Record<string, string | number | boolean | undefined>): Promise<T> {
  const url = new URL(path, BASE_URL);

  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    url.searchParams.set(k, String(v));
  });

  const cacheKey = `cricapi:${path}:${url.searchParams.toString()}`;
  const cached = getCache<T>(cacheKey);
  if (cached) return cached;

  const res = await fetch(url.toString(), {
    headers: {
      "Content-Type": "application/json",
      ...(KEY ? { "x-api-key": KEY } : {}),
      // Some CricAPI setups accept key via query param; we keep headers-only to match prompt.
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[CricAPI] ${path} failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as CricApiResponse<T>;
  // Assume CricAPI returns {status, data}.
  const data = (json as any).data ?? (json as any);

  setCache(cacheKey, data, 5 * 60 * 1000); // 5 minutes
  return data;
}

export const cricApiClient = {
  getCurrentMatches: (tournamentId?: string) =>
    fetchJson<any>("/currentMatches", {
      // tournament_id is optional; pass if we can identify series id
      tournament_id: tournamentId,
      // keep general fields; CricAPI docs vary.
    }),

  getMatchScorecard: (matchId: string | number) =>
    fetchJson<any>("/match_scorecard", { match_id: matchId }),

  getSeries: () => fetchJson<any>("/series", {}),

  getSeriesInfo: (seriesId: string | number) =>
    fetchJson<any>("/series_info", { series_id: seriesId }),
};

