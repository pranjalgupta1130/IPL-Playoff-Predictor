"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Copy,
  CopyPlus,
  Globe,
  Loader2,
  Lock,
} from "lucide-react";
import { api } from "@/services/api";
import { useSimulatorStore } from "@/store/simulatorStore";
import { StandingsPanel } from "@/components/standings/StandingsPanel";
import { PredictionForm } from "@/components/simulator/PredictionForm";
import { ProjectedProbabilitiesPanel } from "@/components/simulator/ProjectedProbabilitiesPanel";
import type { Prediction, Match } from "@/types";

interface SharedPageProps {
  params: Promise<{ shareId: string }>;
}

export default function SharedSimulationPage({ params }: SharedPageProps) {
  const { shareId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<{
    status: number;
    message: string;
  } | null>(null);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const { upcomingMatches } = useSimulatorStore();

  useEffect(() => {
    async function loadSnapshot() {
      if (!shareId) return;
      setLoading(true);
      setErrorState(null);

      try {
        const res = await api.getSimulation(shareId);
        setSnapshot(res.data);
      } catch (err: any) {
        console.error("Error loading simulation snapshot:", err);
        const status = err?.response?.status || 500;
        let message = "Something went wrong while loading the simulation.";
        if (status === 404) {
          message = "Simulation not found. This link may be invalid or deleted.";
        } else if (status === 400) {
          message = "Invalid share link format.";
        }
        setErrorState({ status, message });
      } finally {
        setLoading(false);
      }
    }

    loadSnapshot();
  }, [shareId]);

  // Clone-on-Edit Handler
  const handleContinueFromThisSimulation = (modifiedPayload?: any) => {
    if (!snapshot) return;

    const snapshotPredictions: Prediction[] = snapshot.predictions || [];

    // If an edit was performed, merge/override the specific prediction
    let nextPredictions = [...snapshotPredictions];
    if (modifiedPayload) {
      const targetMatchId = modifiedPayload.matchId;
      const filtered = nextPredictions.filter((p) => {
        const id = typeof p.matchId === "string" ? p.matchId : p.matchId?._id;
        return id !== targetMatchId;
      });

      const newPrediction: Prediction = {
        _id: `cloned-${targetMatchId}`,
        matchId: targetMatchId,
        predictedWinner: modifiedPayload.predictedWinner,
        margin: modifiedPayload.margin,
        marginType: modifiedPayload.marginType,
        ...(modifiedPayload.chaseRuns != null
          ? { chaseRuns: modifiedPayload.chaseRuns }
          : {}),
      };

      nextPredictions = [...filtered, newPrediction];
    }

    // Set cloned predictions into local simulator store
    const store = useSimulatorStore.getState();
    store.recalculateLocally(nextPredictions);

    // Save predictions asynchronously in local state background if needed
    useSimulatorStore.setState({
      predictions: nextPredictions,
    });

    // Navigate user to local simulator
    router.push("/simulator");
  };

  const handleCopyLink = async () => {
    const fullUrl =
      typeof window !== "undefined"
        ? window.location.href
        : `http://localhost:3000/share/${shareId}`;

    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (e) {
      console.error("Failed to copy link:", e);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
        <p className="text-sm font-medium text-muted-foreground">
          Loading Simulation...
        </p>
      </div>
    );
  }

  if (errorState) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 text-red-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            {errorState.status === 404 ? "Simulation Not Found" : "Error Loading Simulation"}
          </h2>
          <p className="text-sm text-muted-foreground">{errorState.message}</p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => router.push("/simulator")}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
            >
              Go to Match Simulator
            </button>
          </div>
        </div>
      </div>
    );
  }

  const snapshotPredictions: Prediction[] = snapshot?.predictions || [];

  // Helper to find prediction in snapshot
  const getSnapshotPrediction = (matchId: string) => {
    return snapshotPredictions.find((p) => {
      const id = typeof p.matchId === "string" ? p.matchId : p.matchId?._id;
      return id === matchId;
    });
  };

  return (
    <div className="space-y-8">
      {/* Read-Only Banner */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-5 backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <Globe className="h-3.5 w-3.5" />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Shared Simulation Snapshot
              </h1>
              <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" /> Immutable
              </span>
            </div>
            <p className="text-xs text-muted-foreground md:text-sm">
              You are viewing a saved simulation snapshot. Editing any match prediction will create your own personal copy.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              {copySuccess ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Link</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleContinueFromThisSimulation()}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 sm:text-sm"
            >
              <CopyPlus className="h-4 w-4" />
              <span>Continue From This Simulation</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {copySuccess && (
          <div className="mt-3 rounded-md bg-emerald-500/20 px-3 py-1.5 text-xs text-emerald-300">
            ✓ Share link copied to clipboard.
          </div>
        )}
      </div>

      {/* Snapshot Match Predictions */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Predicted Matches ({snapshotPredictions.length})
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {upcomingMatches.map((match: Match) => (
            <PredictionForm
              key={match._id}
              match={match}
              existing={getSnapshotPrediction(match._id)}
              onSave={async (payload) => {
                // Clone-on-Edit triggered by match edit
                handleContinueFromThisSimulation(payload);
              }}
              onClear={async (matchId) => {
                // Clone-on-Edit triggered by match clear
                if (!snapshot) return;
                const filtered = snapshotPredictions.filter((p) => {
                  const id = typeof p.matchId === "string" ? p.matchId : p.matchId?._id;
                  return id !== matchId;
                });
                const store = useSimulatorStore.getState();
                store.recalculateLocally(filtered);
                useSimulatorStore.setState({ predictions: filtered });
                router.push("/simulator");
              }}
              loading={false}
            />
          ))}
        </div>
      </section>

      {/* Snapshot Standings Panel */}
      <StandingsPanel
        title="Saved Scenario Standings"
        description="Standings snapshot saved with this simulation"
        showReset={false}
      />

      {/* Snapshot Playoff Probabilities */}
      <ProjectedProbabilitiesPanel />
    </div>
  );
}
