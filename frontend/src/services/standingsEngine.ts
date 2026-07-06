import { getTeamShortName } from "@/constants/teams";
import { calculateNrrDelta, recalculateNrr } from "@/services/nrrEngine";
import type {
  FullStandingsResult,
  Match,
  Prediction,
  StandingsBundle,
  StandingsRow,
  StandingsRowWithMovement,
  TeamBaseline,
} from "@/types";

type TeamSnapshot = TeamBaseline & { name: string; shortName: string };

function cloneTeams(teams: TeamBaseline[]): Map<string, TeamSnapshot> {
  const map = new Map<string, TeamSnapshot>();
  for (const t of teams) {
    map.set(t.name, {
      ...t,
      shortName: t.shortName || getTeamShortName(t.name),
    });
  }
  return map;
}

/** Exported for Monte Carlo — clone baseline without mutating source */
export function snapshotFromTeams(teams: TeamBaseline[]): Map<string, TeamSnapshot> {
  return cloneTeams(teams);
}

export function rowsFromSnapshot(snapshot: Map<string, TeamSnapshot>): StandingsRow[] {
  return Array.from(snapshot.values());
}

function snapshotToRows(snapshot: Map<string, TeamSnapshot>): StandingsRow[] {
  return rowsFromSnapshot(snapshot);
}

export function sortStandings(rows: StandingsRow[]): StandingsRow[] {
  const sorted = [...rows].sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    return y.nrr - x.nrr;
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

/** Real standings from baseline teams only */
export function recalculateStandings(teams: TeamBaseline[]): StandingsBundle {
  return toBundle(snapshotToRows(cloneTeams(teams)));
}

export function applyMatchResult(
  snapshot: Map<string, TeamSnapshot>,
  teamA: string,
  teamB: string,
  winner: string,
  margin: number,
  marginType: string,
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

  winnerTeam.nrr = recalculateNrr(
    winnerTeam.nrr,
    calculateNrrDelta(margin, marginType, true, chaseRuns)
  );
  loserTeam.nrr = recalculateNrr(
    loserTeam.nrr,
    calculateNrrDelta(margin, marginType, false, chaseRuns)
  );
}

/** Apply one user prediction onto a snapshot */
export function applyPrediction(
  snapshot: Map<string, TeamSnapshot>,
  input: {
    teamA: string;
    teamB: string;
    predictedWinner: string;
    margin: number;
    marginType: string;
    chaseRuns?: number;
  }
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

/** Remove prediction effect by rebuilding from baseline + remaining predictions */
export function removePrediction(
  teams: TeamBaseline[],
  upcomingMatches: Match[],
  predictions: Prediction[],
  matchIdToRemove: string
): StandingsBundle {
  const filtered = predictions.filter((p) => {
    const id = typeof p.matchId === "string" ? p.matchId : p.matchId._id;
    return id !== matchIdToRemove;
  });
  return calculateProjectedStandings(teams, upcomingMatches, filtered);
}

export function calculateProjectedStandings(
  teams: TeamBaseline[],
  upcomingMatches: Match[],
  predictions: Prediction[]
): StandingsBundle {
  const snapshot = cloneTeams(teams);
  const byMatch = new Map(
    predictions.map((p) => {
      const id = typeof p.matchId === "string" ? p.matchId : p.matchId._id;
      return [id, p];
    })
  );

  for (const m of upcomingMatches) {
    const pred = byMatch.get(m._id);
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

/** Build real + projected tables with movement indicators */
export function buildFullStandings(
  teams: TeamBaseline[],
  upcomingMatches: Match[],
  predictions: Prediction[]
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
