/** Dummy IPL 2026 data for MVP
 *
 * NOTE: This file is intentionally the only fixture/fixture-state input for the simulation.
 * Monte Carlo + mathematical elimination depend on:
 * - exact string match between Match.teamA/teamB and Team.name
 * - correct completed/upcoming flags
 */

export const SEED_TEAMS = [
  { name: "Chennai Super Kings", shortName: "CSK", played: 10, wins: 6, losses: 4, points: 12, nrr: 0.412 },
  { name: "Mumbai Indians", shortName: "MI", played: 10, wins: 5, losses: 5, points: 10, nrr: 0.185 },
  { name: "Royal Challengers Bengaluru", shortName: "RCB", played: 10, wins: 7, losses: 3, points: 14, nrr: 0.528 },
  { name: "Kolkata Knight Riders", shortName: "KKR", played: 10, wins: 6, losses: 4, points: 12, nrr: 0.301 },
  { name: "Rajasthan Royals", shortName: "RR", played: 10, wins: 5, losses: 5, points: 10, nrr: -0.092 },
  { name: "Sunrisers Hyderabad", shortName: "SRH", played: 10, wins: 6, losses: 4, points: 12, nrr: 0.245 },
  { name: "Delhi Capitals", shortName: "DC", played: 10, wins: 4, losses: 6, points: 8, nrr: -0.210 },
  { name: "Punjab Kings", shortName: "PBKS", played: 10, wins: 4, losses: 6, points: 8, nrr: -0.155 },
  { name: "Lucknow Super Giants", shortName: "LSG", played: 10, wins: 5, losses: 5, points: 10, nrr: 0.078 },
  { name: "Gujarat Titans", shortName: "GT", played: 10, wins: 4, losses: 6, points: 8, nrr: -0.320 },
];

// League format assumption (MVP fixture state):
// - 10 teams, double round-robin = 18 matches per team would be 90 fixtures; real IPL uses different format.
// - For this app we need consistency for mathematical elimination:
//   * total league fixtures must be exactly 70
//   * each team must play exactly 14 league matches
//
// To satisfy those constraints while staying deterministic and simple,
// we build a synthetic 70-match schedule: a round-robin that produces exactly
// 14 matches per team.
//
// IMPORTANT: Monte Carlo + elimination use only the DB list; dates only order matches.

const TEAM_NAMES = SEED_TEAMS.map((t) => t.name);

function i(n: number) {
  return TEAM_NAMES[n];
}

// 70 matches, each team appears exactly 14 times.
// For local/dev fallback only (CricAPI is the real baseline).
export const SEED_MATCHES = (() => {
  const venues = [
    "M. Chinnaswamy Stadium",
    "MA Chidambaram Stadium",
    "Wankhede Stadium",
    "Eden Gardens",
    "Sawai Mansingh Stadium",
    "Rajiv Gandhi Stadium",
    "Arun Jaitley Stadium",
    "BRSABV Ekana Stadium",
    "Narendra Modi Stadium",
    "Punjab Cricket Association IS Bindra Stadium",
  ];

  // Simple deterministic fallback schedule:
  // - Build a base set of 45 pairs via a circle method (9 rounds, 5 matches per round)
  // - Then add 25 more matches by cycling through opponent pairs so each team reaches 14 appearances
  //   (counts enforced by the validation below; no complex balancing).

  const nTeams = TEAM_NAMES.length; // 10
  const target = 14;

  const teams = Array.from({ length: nTeams }, (_, idx) => idx);

  function ringRoundPairs(roundIndex: number): Array<[number, number]> {
    const fixed = teams[0];
    const rest = teams.slice(1);
    const rot = roundIndex % rest.length;
    const rotated = rest.slice(rot).concat(rest.slice(0, rot));

    const out: Array<[number, number]> = [];
    out.push([fixed, rotated[rotated.length - 1]]);
    for (let i2 = 0; i2 < rotated.length / 2; i2++) {
      out.push([rotated[i2], rotated[rotated.length - 1 - i2]]);
    }
    return out;
  }

  const baseRounds = nTeams - 1; // 9
  const basePairs: Array<[number, number]> = [];
  for (let r = 0; r < baseRounds; r++) basePairs.push(...ringRoundPairs(r));

  const counts = new Array<number>(nTeams).fill(0);
  for (const [a, b] of basePairs) {
    counts[a]++;
    counts[b]++;
  }

  const uniquePairs: Array<[number, number]> = [];
  for (let a = 0; a < nTeams; a++) {
    for (let b = a + 1; b < nTeams; b++) {
      uniquePairs.push([a, b]);
    }
  }

  const outPairs: Array<[number, number]> = [...basePairs];

  // Add exactly enough extra matches so every team reaches 14.
  // Each added match increases two teams' counts by 1.
  const remainingNeeded = nTeams * (target - baseRounds); // appearances to add
  const neededMatches = remainingNeeded / 2;

  let idx = 0;
  const maxAttempts = 200000;
  while (outPairs.length < basePairs.length + neededMatches) {
    const [u, v] = uniquePairs[idx % uniquePairs.length];
    const a = outPairs.length % 2 === 0 ? u : v;
    const b = outPairs.length % 2 === 0 ? v : u;

    if (counts[a] < target && counts[b] < target) {
      outPairs.push([a, b]);
      counts[a]++;
      counts[b]++;
    }

    idx++;
    if (idx > maxAttempts) {
      // If we cannot reach the target via this simple heuristic,
      // stop and let the deterministic validation below fail loudly.
      break;
    }
  }


  if (outPairs.length !== 70) {
    throw new Error(`Fallback synthetic schedule length mismatch: got ${outPairs.length}, expected 70`);
  }

  // Validate each team has exactly 14 appearances.
  const countsByName = new Map<string, number>();
  for (const name of TEAM_NAMES) countsByName.set(name, 0);
  for (const [a, b] of outPairs) {
    const A = i(a);
    const B = i(b);
    countsByName.set(A, (countsByName.get(A) ?? 0) + 1);
    countsByName.set(B, (countsByName.get(B) ?? 0) + 1);
  }
  for (const name of TEAM_NAMES) {
    const c = countsByName.get(name) ?? 0;
    if (c !== 14) {
      throw new Error(`Fallback synthetic schedule constraint violated: ${name} has ${c} matches, expected 14`);
    }
  }

  const start = new Date("2026-04-01T00:00:00Z");
  const oneDayMs = 24 * 60 * 60 * 1000;

  return outPairs.map(([aIdx, bIdx], idx2) => {
    const teamA = i(aIdx);
    const teamB = i(bIdx);
    const date = new Date(start.getTime() + idx2 * oneDayMs);
    const completed = idx2 < 50;

    let winner: string | undefined;
    let margin: number | undefined;
    let marginType: "defended_runs" | "chase_overs" | "balls_remaining" | "runs" | "wickets" | undefined;

    if (completed) {
      const pickA = idx2 % 2 === 0;
      winner = pickA ? teamA : teamB;
      marginType = idx2 % 3 === 0 ? "defended_runs" : idx2 % 3 === 1 ? "chase_overs" : "runs";
      margin = 4 + (idx2 % 28);
    }

    return {
      teamA,
      teamB,
      date,
      venue: venues[idx2 % venues.length],
      completed,
      winner,
      margin,
      marginType: marginType as any,
    };
  });
})();


