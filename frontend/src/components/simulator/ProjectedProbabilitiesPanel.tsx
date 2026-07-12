"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSimulatorStore } from "@/store/simulatorStore";
import { QualificationProbabilityBar } from "@/components/qualification/QualificationProbabilityBar";
import { VolatilityBadge } from "@/components/qualification/VolatilityBadge";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProjectedProbabilitiesPanel() {
  const {
    monteCarloResult,
    monteCarloRunning,
    runMonteCarlo,
    predictions,
  } = useSimulatorStore();

  const sortedOdds = useMemo(() => {
    if (!monteCarloResult?.odds) return [];
    return [...monteCarloResult.odds].sort((a, b) => b.playoffPercentage - a.playoffPercentage);
  }, [monteCarloResult]);

  return (
    <Card className="border-emerald-500/20 bg-gradient-to-b from-card to-card/95 shadow-lg shadow-emerald-950/10">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-xl font-bold">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            Projected Playoff Qualification Odds
          </CardTitle>
          <CardDescription>
            Monte Carlo simulation results incorporating your custom match predictions.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => runMonteCarlo()}
          disabled={monteCarloRunning}
          className="shrink-0 border-emerald-500/30 hover:bg-emerald-950/20"
        >
          {monteCarloRunning ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Simulating...
            </>
          ) : (
            <>
              Recalculate Odds
            </>
          )}
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {monteCarloRunning ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Loader2 className="mb-4 h-8 w-8 animate-spin text-emerald-400" />
            <p className="text-sm font-medium text-muted-foreground">
              Running 1,000 simulated IPL playoff scenarios in the background...
            </p>
          </div>
        ) : sortedOdds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-lg">
            <p className="text-sm text-muted-foreground mb-4">
              No projected simulation data loaded.
            </p>
            <Button size="sm" onClick={() => runMonteCarlo()}>
              Run Initial Projection
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {sortedOdds.map((p) => (
              <div
                key={p.teamName}
                className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-4 transition-all duration-300 hover:border-emerald-500/30 hover:bg-emerald-950/5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold tracking-tight">{p.shortName}</span>
                    <VolatilityBadge level={p.volatility} />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    Confidence: {p.confidenceRange.low}% – {p.confidenceRange.high}%
                  </span>
                </div>

                <div className="space-y-1">
                  <QualificationProbabilityBar
                    percentage={p.playoffPercentage}
                    confidence={p.confidence}
                    label="Playoff"
                  />
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <QualificationProbabilityBar
                      percentage={p.topTwoPercentage}
                      confidence={p.confidence}
                      label="Top 2"
                      variant="top2"
                    />
                    <QualificationProbabilityBar
                      percentage={p.eliminationPercentage}
                      confidence={p.confidence}
                      label="Eliminated"
                      variant="elimination"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
