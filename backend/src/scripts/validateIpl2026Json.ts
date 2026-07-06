import fs from "fs";
import path from "path";

type TeamName =
  | "Chennai Super Kings"
  | "Delhi Capitals"
  | "Gujarat Titans"
  | "Kolkata Knight Riders"
  | "Lucknow Super Giants"
  | "Mumbai Indians"
  | "Punjab Kings"
  | "Rajasthan Royals"
  | "Royal Challengers Bengaluru"
  | "Sunrisers Hyderabad";

type IplFixture = {
  fixtureId?: string;
  matchNumber?: number;
  stage?: string;
  date?: string | null;
  time?: string | null;
  venue?: string | null;
  teamA?: string;
  teamB?: string;
  result?: any;
  winner?: string | null;
  margin?: any;
  resultType?: string | null;
  teamAInnings?: any;
  teamBInnings?: any;
};

const IPL_TEAMS: TeamName[] = [
  "Chennai Super Kings",
  "Delhi Capitals",
  "Gujarat Titans",
  "Kolkata Knight Riders",
  "Lucknow Super Giants",
  "Mumbai Indians",
  "Punjab Kings",
  "Rajasthan Royals",
  "Royal Challengers Bengaluru",
  "Sunrisers Hyderabad",
];

function isRecognizedTeam(name: string | undefined | null): name is TeamName {
  if (!name) return false;
  return (IPL_TEAMS as string[]).includes(name);
}

function main() {
  const jsonPath = path.join(__dirname, "..", "..", "data", "ipl-2026.json");
  const raw = fs.readFileSync(jsonPath, "utf8");
  const data = JSON.parse(raw) as any;

  // Accept either {matches: [...]}
  // or plain array.
  const fixtures: IplFixture[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.matches)
      ? data.matches
      : [];

  console.log("Loaded fixtures:", fixtures.length);

  const league = fixtures.filter((f) => f.stage === "league");
  const playoff = fixtures.filter((f) => f.stage !== "league");

  const leagueNums = league.map((f) => f.matchNumber).filter((x) => typeof x === "number") as number[];
  const uniqueLeagueNums = new Set(leagueNums);

  const duplicateMatchNumbers: number[] = [];
  for (const n of uniqueLeagueNums) {
    const c = leagueNums.filter((x) => x === n).length;
    if (c > 1) duplicateMatchNumbers.push(n);
  }

  const fixtureIds = fixtures.map((f) => f.fixtureId).filter(Boolean) as string[];
  const dupFixtureIds: string[] = [];
  const seen = new Set<string>();
  for (const id of fixtureIds) {
    if (seen.has(id)) dupFixtureIds.push(id);
    seen.add(id);
  }

  let selfMatches = 0;
  for (const f of league) {
    if (f.teamA && f.teamB && f.teamA === f.teamB) selfMatches++;
  }

  // Team appearances across league.
  const counts = new Map<string, number>();
  for (const t of IPL_TEAMS) counts.set(t, 0);

  for (const f of league) {
    if (f.teamA) counts.set(f.teamA, (counts.get(f.teamA) ?? 0) + 1);
    if (f.teamB) counts.set(f.teamB, (counts.get(f.teamB) ?? 0) + 1);
  }

  const totalAppearances = Array.from(counts.values()).reduce((a, b) => a + b, 0);

  const perTeam: Record<string, number> = {};
  for (const t of IPL_TEAMS) perTeam[t] = counts.get(t) ?? 0;

  const missingLeagueNums: number[] = [];
  for (let i = 1; i <= 70; i++) {
    if (!uniqueLeagueNums.has(i)) missingLeagueNums.push(i);
  }

  const teamCounts = Object.entries(perTeam).map(([k, v]) => ({ team: k, matches: v / 1 }));

  console.log("Validation summary:");
  console.log({
    leagueCount: league.length,
    playoffCount: playoff.length,
    totalFixtures: fixtures.length,
    missingLeagueNums,
    duplicateMatchNumbers,
    duplicateFixtureIds: dupFixtureIds.slice(0, 20),
    selfMatches,
    totalAppearances,
    perTeam: perTeam,
  });

  const failures: string[] = [];

  if (league.length !== 70) failures.push(`Expected 70 league matches, got ${league.length}`);
  if (playoff.length !== 4) failures.push(`Expected 4 playoff matches, got ${playoff.length}`);

  if (missingLeagueNums.length) failures.push(`Missing league match numbers: ${missingLeagueNums.join(", ")}`);
  if (duplicateMatchNumbers.length) failures.push(`Duplicate league match numbers: ${duplicateMatchNumbers.join(", ")}`);
  if (dupFixtureIds.length) failures.push(`Duplicate fixtureIds: ${Array.from(new Set(dupFixtureIds)).slice(0, 20).join(", ")}`);
  if (selfMatches) failures.push(`Self matches detected: ${selfMatches}`);
  if (totalAppearances !== 140) failures.push(`Expected 140 league appearances, got ${totalAppearances}`);

  for (const t of IPL_TEAMS) {
    const c = perTeam[t];
    if (c !== 14) failures.push(`Team ${t} expected 14 league matches, got ${c}`);
  }

  const special = fixtures.filter((f) => f.matchNumber === 12 || f.matchNumber === 38 || f.matchNumber === 50);
  const specialStageInfo = special.map((f) => ({
    fixtureId: f.fixtureId,
    matchNumber: f.matchNumber,
    stage: f.stage,
    teamA: f.teamA,
    teamB: f.teamB,
    winner: f.winner,
    resultType: f.resultType,
    result: f.result,
  }));
  console.log("Special matches (12/38/50):", JSON.stringify(specialStageInfo, null, 2));

  if (failures.length) {
    console.log("VALIDATION FAIL");
    for (const msg of failures) console.log("-", msg);
  } else {
    console.log("VALIDATION PASS");
  }

  if (failures.length) {
    process.exitCode = 1;
  }
}

main();

