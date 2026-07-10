import { IMatch, MarginType } from "../models/Match";
import { ITeam } from "../models/Team";
import { IPrediction } from "../models/Prediction";
import { getTeamShortName } from "../constants/teams";
import { calculateNrrDelta, recalculateNrr } from "../utils/nrrEngine";

export interface StandingsRow {
  name: string;
  shortName: string;
  played: number;
  wins: number;
  losses: number;
  points: number;
  nrr: number;
  qualified?: boolean;
  rank?: number;
}

export interface StandingsRowWithMovement extends StandingsRow {
  rankChange: number;
  pointsDelta: number;
  nrrDelta: number;
  enteredPlayoffs: boolean;
  droppedFromPlayoffs: boolean;
}

export interface StandingsBundle {
  standings: StandingsRow[];
  topFour: StandingsRow[];
  outsideQualification: StandingsRow[];
}

export interface FullStandingsResult {
  real: StandingsBundle;
  projected: StandingsBundle;
  projectedWithMovement: StandingsRowWithMovement[];
  hasPredictions: boolean;
}

export interface PredictionInput {
  matchId: string;
  teamA: string;
  teamB: string;
  predictedWinner: string;
  margin: number;
  marginType: MarginType;
  chaseRuns?: number;
}

type TeamSnapshot = {
  name: string;
  shortName: string;
  played: number;
  wins: number;
  losses: number;
  points: number;
  nrr: number;
};

export function snapshotFromTeams(teams: ITeam[]): Map<string, TeamSnapshot> {
  return cloneTeams(teams);
}

export function rowsFromSnapshot(snapshot: Map<string, TeamSnapshot>): StandingsRow[] {
  return snapshotToRows(snapshot);
}

function cloneTeams(teams: ITeam[]): Map<string, TeamSnapshot> {
  const map = new Map<string, TeamSnapshot>();
  for (const t of teams) {
    map.set(t.name, {
      name: t.name,
      shortName: t.shortName || getTeamShortName(t.name),
      played: t.played,
      wins: t.wins,
      losses: t.losses,
      points: t.points,
      nrr: t.nrr,
    });
  }
  return map;
}

function snapshotToRows(snapshot: Map<string, TeamSnapshot>): StandingsRow[] {
  return Array.from(snapshot.values());
}

/** Sort by points desc, then NRR desc; tie-break deterministically */
export function sortStandings(rows: StandingsRow[]): StandingsRow[] {
  const sorted = [...rows].sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;

    // Normalize potential float noise / undefined values.
    const xNrr = Number.isFinite(x.nrr) ? x.nrr : -Infinity;
    const yNrr = Number.isFinite(y.nrr) ? y.nrr : -Infinity;

    if (yNrr !== xNrr) return yNrr - xNrr;

    // Deterministic final tie-break to prevent simulation ranking inversions.
    // Using name then shortName keeps the order consistent across runs.
    const xName = x.name ?? "";
    const yName = y.name ?? "";
    if (yName !== xName) return yName.localeCompare(xName);

    return (y.shortName ?? "").localeCompare(x.shortName ?? "");
  });

  return sorted.map((row, index) => ({
    ...row,
    rank: index + 1,
    qualified: index < 4,
  }));
}

function toBundle(rows: StandingsRow[]): StandingsBundle {
  const standings = sortStandings(rows);
  return {
    standings,
    topFour: standings.slice(0, 4),
    outsideQualification: standings.slice(4),
  };
}

/**
 * Real standings — baseline from DB only (completed season to date).
 */
export function recalculateStandings(teams: ITeam[]): StandingsBundle {
  const snapshot = cloneTeams(teams);
  return toBundle(snapshotToRows(snapshot));
}

/**
 * Apply one match result to a team snapshot (points, W/L, NRR).
 */
export function applyMatchResult(
  snapshot: Map<string, TeamSnapshot>,
  teamA: string,
  teamB: string,
  winner: string,
  margin: number,
  marginType: MarginType,
  chaseRuns?: number
): void {
  const loser = winner === teamA ? teamB : teamA;
  const winnerTeam = snapshot.get(winner);
  const loserTeam = snapshot.get(loser);
  if (!winnerTeam || !loserTeam) return;

  winnerTeam.played += 1;
  loserTeam.played += 1;
  winnerTeam.wins += 1;
  loserTeam.losses += 1;
  winnerTeam.points += 2;

  const winDelta = calculateNrrDelta(margin, marginType, true, chaseRuns);
  const lossDelta = calculateNrrDelta(margin, marginType, false, chaseRuns);
  winnerTeam.nrr = recalculateNrr(winnerTeam.nrr, winDelta);
  loserTeam.nrr = recalculateNrr(loserTeam.nrr, lossDelta);
}

/** Apply a single prediction onto a cloned snapshot */
export function applyPrediction(
  snapshot: Map<string, TeamSnapshot>,
  input: Pick<
    PredictionInput,
    "teamA" | "teamB" | "predictedWinner" | "margin" | "marginType" | "chaseRuns"
  >
): void {
  applyMatchResult(
    snapshot,
    input.teamA,
    input.teamB,
    input.predictedWinner,
    input.margin,
    input.marginType,
    input.chaseRuns
  );
}

/** Projected standings = real baseline + all pending predictions */
export function calculateProjectedStandings(
  teams: ITeam[],
  upcomingMatches: IMatch[],
  predictions: IPrediction[]
): StandingsBundle {
  const snapshot = cloneTeams(teams);
  const predictionByMatch = new Map(
    predictions.map((p) => [p.matchId.toString(), p])
  );

  for (const m of upcomingMatches) {
    const pred = predictionByMatch.get(m._id.toString());
    if (!pred) continue;
    applyPrediction(snapshot, {
      teamA: m.teamA,
      teamB: m.teamB,
      predictedWinner: pred.predictedWinner,
      margin: pred.margin,
      marginType: pred.marginType,
      chaseRuns: pred.chaseRuns,
    });
  }

  return toBundle(snapshotToRows(snapshot));
}

function attachMovement(
  real: StandingsBundle,
  projected: StandingsBundle
): StandingsRowWithMovement[] {
  const realRank = new Map(real.standings.map((r) => [r.name, r.rank!]));
  const realQualified = new Map(real.standings.map((r) => [r.name, r.qualified!]));
  const realByName = new Map(real.standings.map((r) => [r.name, r]));

  return projected.standings.map((row) => {
    const base = realByName.get(row.name)!;
    const prevRank = realRank.get(row.name) ?? row.rank!;
    const wasQualified = realQualified.get(row.name) ?? false;

    return {
      ...row,
      rankChange: prevRank - (row.rank ?? prevRank),
      pointsDelta: row.points - base.points,
      nrrDelta: Math.round((row.nrr - base.nrr) * 1000) / 1000,
      enteredPlayoffs: !wasQualified && !!row.qualified,
      droppedFromPlayoffs: wasQualified && !row.qualified,
    };
  });
}

/** Full real + projected standings with movement metadata */
export function buildFullStandings(
  teams: ITeam[],
  upcomingMatches: IMatch[],
  predictions: IPrediction[]
): FullStandingsResult {
  const real = recalculateStandings(teams);
  const projected = calculateProjectedStandings(teams, upcomingMatches, predictions);

  return {
    real,
    projected,
    projectedWithMovement: attachMovement(real, projected),
    hasPredictions: predictions.length > 0,
  };
}

/** @deprecated Use buildFullStandings — kept for minimal breaking change */
export function calculateStandings(
  baseTeams: ITeam[],
  _completedMatches: IMatch[],
  upcomingMatches: IMatch[],
  predictions: IPrediction[]
): StandingsBundle & { standings: StandingsRow[] } {
  const full = buildFullStandings(baseTeams, upcomingMatches, predictions);
  return full.projected;
}
