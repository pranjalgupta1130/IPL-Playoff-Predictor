"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, Loader2, Share2 } from "lucide-react";
import { api } from "@/services/api";
import { useSimulatorStore } from "@/store/simulatorStore";

export function SaveShareBar() {
  const router = useRouter();
  const {
    predictions,
    completedMatches,
    fullStandings,
    monteCarloResult,
  } = useSimulatorStore();

  const [isSaving, setIsSaving] = useState(false);
  const [savedData, setSavedData] = useState<{ shareId: string; shareUrl: string } | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSave = async () => {
    if (!fullStandings || !monteCarloResult) return;
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const payload = {
        predictions,
        completedMatchesSnapshot: completedMatches,
        generatedStandings: fullStandings,
        playoffProbabilities: monteCarloResult,
        metadata: {
          savedAt: new Date().toISOString(),
          predictionCount: predictions.length,
        },
      };

      const res = await api.saveSimulation(payload);

      // Fallback shareUrl calculation if window is available
      const shareId = res.data.shareId;
      const shareUrl =
        res.data.shareUrl ||
        (typeof window !== "undefined"
          ? `${window.location.origin}/share/${shareId}`
          : `/share/${shareId}`);

      setSavedData({ shareId, shareUrl });
    } catch (err: any) {
      console.error("Failed to save simulation:", err);
      setErrorMessage(
        err?.response?.data?.message || err?.message || "Failed to save simulation"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = async () => {
    if (!savedData) return;

    const fullUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/share/${savedData.shareId}`
        : savedData.shareUrl;

    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (e) {
      console.error("Clipboard write error:", e);
    }
  };

  const handleOpenShared = () => {
    if (!savedData) return;
    router.push(`/share/${savedData.shareId}`);
  };

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4 backdrop-blur sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h3 className="flex items-center gap-2 font-semibold text-foreground">
            <Share2 className="h-4 w-4 text-emerald-400" />
            Save & Share Simulation
          </h3>
          <p className="text-xs text-muted-foreground">
            Generate an immutable share link to showcase your playoff scenario and standings.
          </p>
        </div>

        {savedData ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300">
              <Check className="h-3.5 w-3.5" />
              <span>Simulation Saved</span>
            </div>

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
              onClick={handleOpenShared}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Open Shared Simulation</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !fullStandings || !monteCarloResult}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving Simulation...</span>
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" />
                <span>Save Simulation</span>
              </>
            )}
          </button>
        )}
      </div>

      {copySuccess && (
        <div className="mt-3 rounded-md bg-emerald-500/20 px-3 py-1.5 text-xs text-emerald-300">
          ✓ Link copied successfully. Anyone with this link can view your simulation snapshot!
        </div>
      )}

      {errorMessage && (
        <div className="mt-3 rounded-md bg-red-500/20 px-3 py-1.5 text-xs text-red-300">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
