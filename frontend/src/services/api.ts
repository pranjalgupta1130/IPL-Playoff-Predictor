 import axios from "axios";
import type {
  FullStandingsResult,
  Match,
  Prediction,
  PredictionPayload,
  TeamBaseline,
} from "@/types";

const API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api`;

console.log("NEXT_PUBLIC_API_URL =", process.env.NEXT_PUBLIC_API_URL);
console.log("API_URL =", API_URL);

const client = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

client.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("ipl_predictor_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const api = {
  health: () => client.get("/health"),

  // Auth endpoints
  login: (payload: any) => client.post("/auth/login", payload),
  register: (payload: any) => client.post("/auth/register", payload),
  getMe: () => client.get("/auth/me"),
  updateStats: (payload: any) => client.put("/auth/stats", payload),

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

  getQualification: (includeUserPredictions?: boolean) =>
    client.get<import("@/types/universeApi").QualificationApiResponse>("/qualification", {
      params: includeUserPredictions !== undefined ? { includeUserPredictions } : undefined,
    }),

  getTeamQualification: (teamName: string, includeUserPredictions?: boolean) =>
    client.get<{
      requirements: import("@/types").QualificationRequirements;
      probability: import("@/types").QualificationProbability;
      standings: FullStandingsResult;
    }>(`/qualification/team/${encodeURIComponent(teamName)}`, {
      params: includeUserPredictions !== undefined ? { includeUserPredictions } : undefined,
    }),

  saveSimulation: (payload: {
    predictions: any;
    completedMatchesSnapshot: any;
    generatedStandings: any;
    qualificationResults?: any;
    playoffProbabilities: any;
    metadata?: any;
  }) => client.post<{ shareId: string; shareUrl: string }>("/simulations/save", payload),

  getSimulation: (shareId: string) =>
    client.get<any>(`/simulations/${shareId}`),
};

