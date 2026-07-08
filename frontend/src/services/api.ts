 import axios from "axios";
import type {
  FullStandingsResult,
  Match,
  Prediction,
  PredictionPayload,
  TeamBaseline,
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const client = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

export const api = {
  health: () => client.get("/health"),

  getTeams: () => client.get<TeamBaseline[]>("/teams"),

  getStandings: () => client.get<FullStandingsResult>("/teams/standings"),

  getMatches: () => client.get<Match[]>("/matches"),

  getUpcomingMatches: () => client.get<Match[]>("/matches/upcoming"),

  getCompletedMatches: () => client.get<Match[]>("/matches/completed"),

  getPredictions: () => client.get<Prediction[]>("/predictions"),

  savePrediction: (payload: PredictionPayload) =>
    client.post<{ prediction: Prediction; standings: FullStandingsResult }>(
      "/predictions",
      payload
    ),

  deletePrediction: (matchId: string) =>
    client.delete<{ standings: FullStandingsResult }>(`/predictions/${matchId}`),

  resetAllPredictions: () =>
    client.delete<{ standings: FullStandingsResult; predictions: Prediction[] }>(
      "/predictions/reset/all"
    ),

  getUniverse: () =>
    client.get<import("@/types/universeApi").UniverseApiResponse>("/universe"),

  getQualification: () =>
    client.get<import("@/types/universeApi").QualificationApiResponse>("/qualification"),






  getTeamQualification: (teamName: string) =>
    client.get<{
      requirements: import("@/types").QualificationRequirements;
      probability: import("@/types").QualificationProbability;
      standings: FullStandingsResult;
    }>(`/qualification/team/${encodeURIComponent(teamName)}`),

  registerUser: (payload: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    favouriteTeam?: string;
  }) =>
    client.post<{
      message: string;
      user: { id: string; name: string; email: string; favouriteTeam?: string };
    }>("/auth/register", payload),

  loginUser: (payload: { email: string; password: string }) =>
    client.post<{
      message: string;
      user: { id: string; name: string; email: string; favouriteTeam?: string };
    }>("/auth/login", payload),
};


