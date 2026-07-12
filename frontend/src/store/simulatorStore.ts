import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  FullStandingsResult,
  Match,
  MonteCarloResult,
  Prediction,
  PredictionPayload,
  TableViewMode,
  TeamBaseline,
} from "@/types";
import { api } from "@/services/api";
import { useAuthStore } from "./authStore";
import { buildFullStandings } from "@/services/standingsEngine";
import { clearMonteCarloCache } from "@/services/qualificationProbability";

interface SimulatorState {
  baseTeams: TeamBaseline[];
  fullStandings: FullStandingsResult | null;
  upcomingMatches: Match[];
  completedMatches: Match[];
  predictions: Prediction[];
  tableView: TableViewMode;
  selectedTeam: string;
  monteCarloResult: MonteCarloResult | null;
  officialMonteCarloResult: MonteCarloResult | null;
  monteCarloProgress: number;
  monteCarloRunning: boolean;
  loading: boolean;
  error: string | null;

  setTableView: (mode: TableViewMode) => void;
  setSelectedTeam: (teamName: string) => void;
  fetchAll: () => Promise<void>;
  runMonteCarlo: () => Promise<void>;
  recalculateLocally: (predictions: Prediction[]) => void;
  savePrediction: (payload: PredictionPayload) => Promise<void>;
  clearPrediction: (matchId: string) => Promise<void>;
  resetAllPredictions: () => Promise<void>;
}

function recompute(
  baseTeams: TeamBaseline[],
  upcomingMatches: Match[],
  predictions: Prediction[]
): FullStandingsResult {
  return buildFullStandings(baseTeams, upcomingMatches, predictions);
}

export const useSimulatorStore = create<SimulatorState>()(
  persist(
    (set, get) => ({
      baseTeams: [],
      fullStandings: null,
      upcomingMatches: [],
      completedMatches: [],
      predictions: [],
      tableView: "real",
      selectedTeam: "Royal Challengers Bengaluru",
      monteCarloResult: null,
      officialMonteCarloResult: null,
      monteCarloProgress: 0,
      monteCarloRunning: false,
      loading: false,
      error: null,

      setTableView: (mode) => set({ tableView: mode }),
      setSelectedTeam: (teamName) => set({ selectedTeam: teamName }),

      recalculateLocally: (predictions) => {
        const { baseTeams, upcomingMatches } = get();
        if (!baseTeams.length) return;
        clearMonteCarloCache();
        set({
          fullStandings: recompute(baseTeams, upcomingMatches, predictions),
          monteCarloResult: null,
        });
      },

      runMonteCarlo: async () => {
        set({ monteCarloRunning: true, monteCarloProgress: 0 });

        try {
          const res = await api.getQualification(true);
          const result = res.data.monteCarlo;
          
          set({
            monteCarloResult: result as any,
            monteCarloRunning: false,
            monteCarloProgress: 1,
          });

          // Sync total simulations count to database profile
          const authState = useAuthStore.getState();
          if (authState.isAuthenticated && authState.user) {
            void authState.updateUserStats(authState.user.totalSimulationsCount + 1, undefined);
          }
        } catch (e: any) {
          set({ monteCarloRunning: false, error: "Monte Carlo simulation failed" });
        }
      },

      fetchAll: async () => {
        set({ loading: true, error: null });
        try {
          const [universeRes, qualRes, predictionsRes, completedRes, projectedRes] = await Promise.all([
            api.getUniverse(),
            api.getQualification(false),
            api.getPredictions(),
            api.getCompletedMatches(),
            api.getQualification(true),
          ]);

          const universe = universeRes.data;
          const qualification = qualRes.data;
          const projected = projectedRes.data;
          const completedMatches = completedRes.data;

          set({
            // Base teams are derived from backend-qualified standings to ensure Match-50 correctness
            baseTeams: qualification.standings.real.standings,
            fullStandings: projected.standings,

            // Upcoming matches are authoritative from /api/universe
            upcomingMatches: universe.upcomingFixtures as unknown as Match[],

            // Fetch completed matches for Fixtures page
            completedMatches,

            predictions: predictionsRes.data,
            selectedTeam:
              get().selectedTeam || qualification.standings.real.standings[0]?.name || "",
            loading: false,
          });

          // Use backend-provided probabilities (no local Monte Carlo as authoritative)
          set({
            // Backend Monte Carlo results
            officialMonteCarloResult: qualification.monteCarlo as any,
            monteCarloResult: projected.monteCarlo as any,
          });
        } catch (e: any) {
          set({
            loading: false,
            error:
              e?.message ||
              "Could not load data from /api/universe and /api/qualification. Is the backend running?",
          });
        }
      },

      savePrediction: async (payload) => {
        // Optimistic update first — no loading flag (instant UI)
        const prevPredictions = get().predictions;
        const optimistic: Prediction = {
          _id: `temp-${payload.matchId}`,
          // Backend expects `matchId` to be the Mongo Match _id.
          matchId: payload.matchId,
          predictedWinner: payload.predictedWinner,
          margin: payload.margin,
          marginType: payload.marginType,
          ...(payload.chaseRuns != null ? { chaseRuns: payload.chaseRuns } : {}),
        };

        const withoutDup = prevPredictions.filter((p) => {
          const id = typeof p.matchId === "string" ? p.matchId : p.matchId._id;
          return id !== payload.matchId;
        });

        const next = [...withoutDup, optimistic];

        set({ predictions: next, error: null });
        get().recalculateLocally(next);

        try {
          const { data } = await api.savePrediction(payload);
          const predictions = await api.getPredictions();
          set({
            fullStandings: data.standings,
            predictions: predictions.data,
            error: null,
          });
          get().runMonteCarlo();

          // Sync saved simulations count to database profile
          const authState = useAuthStore.getState();
          if (authState.isAuthenticated && authState.user) {
            void authState.updateUserStats(undefined, authState.user.savedSimulationsCount + 1);
          }
        } catch (e: any) {
          const status = e?.response?.status;
          const message = e?.response?.data?.message;
          set({
            predictions: prevPredictions,
            error:
              message ||
              (typeof status === "number" ? `Request failed (status ${status})` : null) ||
              (typeof e?.message === "string" ? e.message : null) ||
              String(e) ||
              "Failed to save prediction",
          });
          get().recalculateLocally(prevPredictions);
        }


      },

      clearPrediction: async (matchId) => {
        const prevPredictions = get().predictions;
        const next = prevPredictions.filter((p) => {
          const id = typeof p.matchId === "string" ? p.matchId : p.matchId._id;
          return id !== matchId;
        });

        set({ predictions: next, error: null });
        get().recalculateLocally(next);

        try {
          const { data } = await api.deletePrediction(matchId);
          const predictions = await api.getPredictions();
          set({
            fullStandings: data.standings,
            predictions: predictions.data,
          });
          get().runMonteCarlo();
        } catch {
          set({
            predictions: prevPredictions,
            error: "Failed to clear prediction",
          });
          get().recalculateLocally(prevPredictions);
        }
      },

      resetAllPredictions: async () => {
        const prevPredictions = get().predictions;
        set({ predictions: [], error: null });
        get().recalculateLocally([]);

        try {
          const { data } = await api.resetAllPredictions();
          set({
            fullStandings: data.standings,
            predictions: data.predictions ?? [],
            tableView: "real",
          });
          get().runMonteCarlo();
        } catch {
          set({ predictions: prevPredictions, error: "Failed to reset predictions" });
          get().recalculateLocally(prevPredictions);
        }
      },
    }),
    {
      name: "ipl-simulator-storage",
      partialize: (state) => ({
        predictions: state.predictions,
        tableView: state.tableView,
        selectedTeam: state.selectedTeam,
        monteCarloResult: state.monteCarloResult,
        officialMonteCarloResult: state.officialMonteCarloResult,
      }),
    }
  )
);
