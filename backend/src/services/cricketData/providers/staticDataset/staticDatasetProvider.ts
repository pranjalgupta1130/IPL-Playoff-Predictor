import fs from "fs";
import path from "path";
import type { CricketDataProvider, ProviderFixture } from "../../types/CricketDataProvider";

type Stage = "league" | "qualifier1" | "qualifier2" | "eliminator" | "final";

type Innings = {
  team: string;
  runs: number;
  wickets: number | null;
  overs: string | null;
};

type FixtureRecord = {
  fixtureId: string;
  matchNumber: number | null;
  stage: Stage | string;
  venue: string | null;
  dateTimeText?: string | null;
  date?: string | null;
  teamA: string;
  teamB: string;
  innings?: Innings[];
  result?: string | null;
  winner?: string | null;
  margin?: string | number | null;
  resultType?: string | null;
};

type Ipl2026JsonShape = {
  fixtures?: FixtureRecord[];
  matches?: FixtureRecord[];
  data?: FixtureRecord[];
} | FixtureRecord[];

type StageMapping = {
  league: true;
  qualifier1: true;
  qualifier2: true;
  eliminator: true;
  final: true;
};

function parseDateTimeTextToDate(dateTimeText: string, fixtureId: string): Date {
  // Deterministic parser for values like:
  // "MAY, SUN 31 , 7:30 pm IST" (note the spaces around day)
  // We force year 2026 and treat the time as IST.
  const raw = String(dateTimeText);

  const re = /^\s*([A-Z]{3})\s*,\s*([A-Z]{3})\s+(\d{1,2})\s*,\s*(\d{1,2}):(\d{2})\s*(am|pm)\s+IST\s*$/i;
  const m = raw.match(re);
  if (!m) {
    throw new Error(
      `StaticDatasetProvider: failed to parse dateTimeText for fixtureId='${fixtureId}': '${raw}'`
    );
  }

  const monthAbbr = m[1].toUpperCase();
  const dayOfMonth = Number(m[3]);
  const hour12 = Number(m[4]);
  const minute = Number(m[5]);
  const ampm = m[6].toLowerCase();

  const monthMap: Record<string, number> = {
    JAN: 0,
    FEB: 1,
    MAR: 2,
    APR: 3,
    MAY: 4,
    JUN: 5,
    JUL: 6,
    AUG: 7,
    SEP: 8,
    OCT: 9,
    NOV: 10,
    DEC: 11,
  };

  const monthIndex = monthMap[monthAbbr];
  if (monthIndex === undefined) {
    throw new Error(
      `StaticDatasetProvider: unknown month '${monthAbbr}' for fixtureId='${fixtureId}': '${raw}'`
    );
  }

  let hour24 = hour12 % 12;
  if (ampm === "pm") hour24 += 12;

  // Convert IST (UTC+5:30) -> UTC by subtracting 5h30m.
  // Use Date.UTC to avoid environment locale issues.
  const year = 2026;
  const utcMillis = Date.UTC(year, monthIndex, dayOfMonth, hour24, minute, 0) - (5.5 * 60 * 60 * 1000);
  const dt = new Date(utcMillis);

  if (Number.isNaN(dt.getTime())) {
    throw new Error(
      `StaticDatasetProvider: computed invalid Date for fixtureId='${fixtureId}': '${raw}'`
    );
  }

  return dt;
}

function parseRunsWicketsMargin(result: string): { margin: number; marginType: "runs" | "wickets" } | null {
  // Examples from JSON:
  // "Royal Challengers Bengaluru Won by 5 Wickets (Winners)"
  // "Sunrisers Hyderabad Won by 33 Runs"
  // "Delhi Capitals Won by 6 Wickets"
  const raw = String(result);

  const runsMatch = raw.match(/Won by\s+(\d+)\s+Runs?/i);
  if (runsMatch) {
    return { margin: Number(runsMatch[1]), marginType: "runs" };
  }

  const wicketsMatch = raw.match(/Won by\s+(\d+)\s+Wickets?/i);
  if (wicketsMatch) {
    return { margin: Number(wicketsMatch[1]), marginType: "wickets" };
  }

  return null;
}

function parseDltRunsMargin(result: string): { margin: number; marginType: "runs" } | null {
  // Example: "Lucknow Super Giants Won by 9 Runs (D/L Method)"
  const raw = String(result);
  const dmatch = raw.match(/Won by\s+(\d+)\s+Runs?\s*\(D\/L Method\)/i);
  if (!dmatch) return null;
  return { margin: Number(dmatch[1]), marginType: "runs" };
}

function parseSuperOver(_result: string): null {
  // Super Over is a tie-break and our simplified NRR engine does not model regulation-vs-super-over.
  // We therefore must not create any fictional margin/marginType that would affect NRR.
  return null;
}


function normalizeResultToMargin(
  result: string | null | undefined,
  winner: string | null | undefined
): { winner?: string; margin?: number; marginType?: "runs" | "wickets" } {
  const res = result ? String(result) : "";
  if (!res.trim()) return {};

  // If it's a no result, we must not invent winner/margins.
  if (/No Result/i.test(res) || winner == null) return {};

  // Super Over
  // Do not fabricate an NRR delta representation (our NRR engine does not model regulation-over vs super-over).
  // We only preserve winner; leaving margin/marginType undefined ensures NRR reconstruction can skip it.
  if (/Won by\s+Super Over/i.test(res)) {
    return { winner: winner ?? undefined };
  }

  // D/L
  const dlt = parseDltRunsMargin(res);
  if (dlt) return { winner: winner ?? undefined, margin: dlt.margin, marginType: dlt.marginType };

  // Regular "Won by N runs/wickets"
  const rw = parseRunsWicketsMargin(res);
  if (rw) return { winner: winner ?? undefined, margin: rw.margin, marginType: rw.marginType };

  return {};
}

function fixtureToProviderFixture(f: FixtureRecord): ProviderFixture {
  if (!f.fixtureId) {
    throw new Error(`StaticDatasetProvider: missing fixtureId for teamA='${f.teamA}' teamB='${f.teamB}'`);
  }

  const date = f.date
    ? new Date(f.date)
    : parseDateTimeTextToDate((f as any).dateTimeText, f.fixtureId);

  // Static dataset fixtures in this repository are pre-validated externally.
  // Determine completion.
  // Static dataset uses f.result="No Result" for abandoned/played matches like Match 12.
  // Required MVP behavior: such matches must remain completed=true, but with winner undefined.
  // Therefore: completion is treated as true whenever fixture has a result string (including "No Result").
  const completed = f.result != null;

  const normalized = normalizeResultToMargin(f.result ?? undefined, f.winner ?? undefined);

  return {
    fixtureId: f.fixtureId,
    teamA: f.teamA,
    teamB: f.teamB,
    date,
    venue: (f.venue ?? "").trim(),
    completed,
    winner: completed ? (normalized.winner ?? undefined) : undefined,

    // Map into existing Match contract:
    // - NRR engine expects marginType values in enum: defended_runs/chase_overs/balls_remaining
    // - existing code also accepts legacy "runs" and "wickets" via normalizeResultType() in cricketUtils.ts.
    margin: completed ? normalized.margin : undefined,
    marginType: completed ? (normalized.marginType as any) : undefined,

    // Minimal match metadata requested by the MVP requirements.
    matchNumber: f.matchNumber,
    stage: f.stage,
  };
}

export class StaticDatasetCricketDataProvider implements CricketDataProvider {
  async fetchFixtures(): Promise<ProviderFixture[]> {
    const jsonPath = path.join(__dirname, "../../../..", "data", "ipl-2026.json");
    const raw = fs.readFileSync(jsonPath, "utf8");
    const parsed: Ipl2026JsonShape = JSON.parse(raw);

    const fixtures: FixtureRecord[] = Array.isArray(parsed)
      ? parsed
      : (parsed.fixtures ?? parsed.matches ?? parsed.data ?? []);

    return fixtures.map((f) => fixtureToProviderFixture(f));
  }
}

