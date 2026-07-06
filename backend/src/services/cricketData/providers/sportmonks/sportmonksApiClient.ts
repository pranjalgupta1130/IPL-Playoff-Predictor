// Sportmonks Cricket API scaffold.
// NOTE: Exact endpoints/params may differ depending on your Sportmonks plan.
// This file is intentionally structured so you only need to adjust fetch calls.

import type { SportmonksFixturesResponse } from "./sportmonksTypes";

// Sportmonks has multiple possible API hostnames depending on plan/version.
// Default to the commonly used cricket endpoint; allow override via SPORTMONKS_BASE_URL.
const BASE_URL = process.env.SPORTMONKS_BASE_URL || "https://api.sportmonks.com/v1/cricket";


function getSportmonksKey(): string {
  // Ensure env is resolved at call-time (seed/universe may load dotenv at runtime).
  const k = process.env.SPORTMONKS_API_KEY;
  if (!k) return "";
  return String(k);
}


type FetchJson = <T>(url: string, init?: RequestInit) => Promise<T>;

const fetchJson: FetchJson = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[Sportmonks] Request failed: ${res.status} ${text}`);
  }
  return (await res.json()) as T;
};

export async function sportmonksFetchFixtures(): Promise<SportmonksFixturesResponse> {
  const KEY = getSportmonksKey();
  if (!KEY) {
    throw new Error("SPORTMONKS_API_KEY missing");
  }



  // IPL example; update league/tournament IDs as needed.
  // Keep query params provider-agnostic to avoid coupling engines.
  // Many Sportmonks endpoints require: api_token, season_id/league_id.

  const leagueId = process.env.SPORTMONKS_IPL_LEAGUE_ID || "";
  const seasonId = process.env.SPORTMONKS_SEASON_ID || "";

  const params: Record<string, string> = {
    api_token: KEY,
  };
  if (leagueId) params["league_id"] = leagueId;
  if (seasonId) params["season_id"] = seasonId;

  const search = new URLSearchParams(params).toString();
  const url = `${BASE_URL}/fixtures?${search}`;

  // If your provider uses a different endpoint, adjust it here.
  return fetchJson<SportmonksFixturesResponse>(url);
}

