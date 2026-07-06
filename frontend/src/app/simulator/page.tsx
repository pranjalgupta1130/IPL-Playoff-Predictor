"use client";

import { StandingsPanel } from "@/components/standings/StandingsPanel";
import { PredictionForm } from "@/components/simulator/PredictionForm";
import { useSimulatorStore } from "@/store/simulatorStore";
import type { Prediction } from "@/types";

function getPredictionForMatch(
  predictions: Prediction[],
  matchId: string
): Prediction | undefined {
  return predictions.find((p) => {
    const id = typeof p.matchId === "string" ? p.matchId : p.matchId?._id;
    return id === matchId;
  });
}

export default function SimulatorPage() {
  const {
    upcomingMatches,
    predictions,
    loading,
    savePrediction,
    clearPrediction,
    resetAllPredictions,
    fullStandings,
  } = useSimulatorStore();

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Match Simulator</h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Pick a winner and margin for upcoming matches. Standings recalculate instantly
          with no page refresh — then compare real vs projected tables.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {upcomingMatches.map((match) => (
          <PredictionForm
            key={match._id}
            match={match}
            existing={getPredictionForMatch(predictions, match._id)}
            onSave={savePrediction}
            onClear={clearPrediction}
            loading={loading}
          />
        ))}
      </div>

      {fullStandings?.hasPredictions && (
        <p className="text-center text-sm text-muted-foreground">
          {predictions.length} prediction(s) applied ·{" "}
          <button
            type="button"
            className="text-emerald-400 underline-offset-4 hover:underline"
            onClick={() => resetAllPredictions()}
          >
            Reset all to restore real standings
          </button>
        </p>
      )}

      <StandingsPanel
        title="Scenario Standings"
        description="Real baseline vs projected after your picks"
        showReset
      />
    </div>
  );
}
