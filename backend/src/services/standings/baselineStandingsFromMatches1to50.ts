import { IMatch } from "../../models/Match";
import { ITeam } from "../../models/Team";
import { applyMatchResult, sortStandings, StandingsBundle } from "../standingsService";

export function reconstructBaselineStandingsFromMatches1to50(
  teams: ITeam[],
  completedMatches1to50: IMatch[]
): StandingsBundle {
  // Build the initial snapshot from the actual league match participants.
  // Do not depend on the MongoDB Team collection being populated.

  const shortNameByTeam = new Map<string, string | undefined>();
  for (const t of teams) {
    shortNameByTeam.set(t.name, t.shortName);
  }

  const uniqueTeamNames = new Set<string>();
  for (const m of completedMatches1to50) {
    if (m.teamA) uniqueTeamNames.add(m.teamA);
    if (m.teamB) uniqueTeamNames.add(m.teamB);
  }

  const derivedNames = [...uniqueTeamNames].sort();
  if (derivedNames.length !== 10) {
    throw new Error(
      `Expected exactly 10 unique teams in baseline reconstruction, got ${derivedNames.length}: ${derivedNames.join(
        ", "
      )}`
    );
  }

  const snapshot = new Map(
    derivedNames.map((name) => [
      name,
      {
        name,
        shortName: shortNameByTeam.get(name) ?? name,
        played: 0,
        wins: 0,
        losses: 0,
        points: 0,
        nrr: 0,
      },
    ])
  );

  const sorted = [...completedMatches1to50].sort(
    (a, b) => a.matchNumber! - b.matchNumber!
  );

  for (const m of sorted) {
    if (!m.completed) continue;

    // NO RESULT (winner absent)
    if (!m.winner) {
      const teamA = snapshot.get(m.teamA);
      const teamB = snapshot.get(m.teamB);
      if (!teamA || !teamB) {
        throw new Error(
          `Unknown team in No Result match: matchId=${m._id.toString()} matchNumber=${m.matchNumber} teamA=${m.teamA} teamB=${m.teamB}`
        );
      }

      teamA.played += 1;
      teamA.points += 1;
      teamB.played += 1;
      teamB.points += 1;
      continue;
    }

    // SPECIAL RESULT WITHOUT NRR INPUTS
    // Expected for the Super Over match.
    // We must NOT create a fictional margin/marginType NRR delta.
    if (m.margin == null || !m.marginType) {
      const winner = snapshot.get(m.winner);

      const loserName =
        m.winner === m.teamA
          ? m.teamB
          : m.winner === m.teamB
            ? m.teamA
            : undefined;

      const loser = loserName ? snapshot.get(loserName) : undefined;

      if (!winner || !loser) {
        throw new Error(
          `Unknown team in special match result: matchId=${m._id.toString()} matchNumber=${m.matchNumber} teamA=${m.teamA} teamB=${m.teamB} winner=${m.winner}`
        );
      }

      winner.played += 1;
      winner.wins += 1;
      winner.points += 2;

      loser.played += 1;
      loser.losses += 1;
      continue;
    }

    // NORMAL COMPLETED MATCH
    applyMatchResult(
      snapshot as any,
      m.teamA,
      m.teamB,
      m.winner,
      m.margin,
      m.marginType as any,
      m.chaseRuns
    );
  }

  const rows = sortStandings(
    Array.from(snapshot.values()).map((r) => ({
      name: r.name,
      shortName: r.shortName || r.name,
      played: r.played,
      wins: r.wins,
      losses: r.losses,
      points: r.points,
      nrr: r.nrr,
    }))
  );

  return {
    standings: rows.map((r) => ({
      ...r,
      qualified: (r.rank ?? 0) < 4,
      rank: r.rank,
    })),
    topFour: rows.slice(0, 4),
    outsideQualification: rows.slice(4),
  };
}

