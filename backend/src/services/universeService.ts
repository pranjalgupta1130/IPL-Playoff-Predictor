import { Team } from "../models/Team";
import { Match } from "../models/Match";
import { Prediction } from "../models/Prediction";
import { UniverseState } from "../types/universe";
import { deriveLeagueUniverse, buildCompletedMatchesExactly50, buildUpcomingFixturesExactly20 } from "./universe/derivedLeagueUniverse";
import { reconstructBaselineStandingsFromMatches1to50 } from "./standings/baselineStandingsFromMatches1to50";
import { buildFullStandings } from "./standingsService";

export async function loadUniverseState(includeUserPredictions = true): Promise<UniverseState> {
  const teams = await Team.find({});
  const matches = await Match.find({});
  const predictions = includeUserPredictions ? await Prediction.find({}) : [];

  const derived = deriveLeagueUniverse(matches, predictions);

  const completedMatches = buildCompletedMatchesExactly50(derived.baseline.completedMatches1to50);
  const upcomingMatches = buildUpcomingFixturesExactly20(derived.baseline.upcomingMatches51to70);

  const baselineStandings = reconstructBaselineStandingsFromMatches1to50(teams, completedMatches);

  const reconstructedTeams = baselineStandings.standings.map((row) => ({
    name: row.name,
    shortName: row.shortName,
    played: row.played,
    wins: row.wins,
    losses: row.losses,
    points: row.points,
    nrr: row.nrr,
  })) as any[];

  const fullStandings = buildFullStandings(
    reconstructedTeams,
    upcomingMatches,
    derived.simulationUniverse.predictionsForUpcoming
  );

  return {
    baseline: {
      teams: reconstructedTeams,
      completedMatches,
      upcomingMatches,
    },
    simulation: {
      predictions: derived.simulationUniverse.predictionsForUpcoming,
      fullStandings,
    },
  };
}
