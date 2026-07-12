"use client";

import { useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QualificationProbabilityBar } from "@/components/qualification/QualificationProbabilityBar";
import { VolatilityBadge } from "@/components/qualification/VolatilityBadge";
import { PointsTable } from "@/components/standings/PointsTable";
import { StandingsTableToggle } from "@/components/standings/StandingsTableToggle";
import { useSimulatorStore } from "@/store/simulatorStore";
import {
  calculateQualificationRequirements,
  generateQualificationSummary,
  resolveQualificationStatus,
} from "@/services/qualificationEngine";
import { getTeamShortName } from "@/constants/teams";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Target,
  TrendingUp,
  Trophy,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { QualificationStatus } from "@/types";

const STATUS_LABELS: Record<QualificationStatus, string> = {
  qualified: "Playoff zone",
  strong_favorite: "Strong favorite",
  likely: "Likely qualifier",
  in_contention: "In contention",
  must_win: "Must-win pressure",
  nrr_battle: "NRR battle",
  mathematically_alive: "Mathematically alive",
  eliminated: "Eliminated",
};

function statusVariant(
  status: QualificationStatus
): "default" | "secondary" | "destructive" | "outline" {
  if (
    status === "qualified" ||
    status === "strong_favorite" ||
    status === "likely"
  ) {
    return "default";
  }
  if (status === "eliminated" || status === "must_win") return "destructive";
  return "outline";
}

export function TeamQualificationDashboard() {
  const {
    baseTeams,
    fullStandings,
    upcomingMatches,
    predictions,
    tableView,
    setTableView,
    selectedTeam,
    setSelectedTeam,
    monteCarloResult,
    officialMonteCarloResult,
    monteCarloProgress,
    monteCarloRunning,
    fetchAll,
  } = useSimulatorStore();

  useEffect(() => {
    if (!officialMonteCarloResult && !monteCarloRunning) {
      void fetchAll();
    }
  }, [officialMonteCarloResult, monteCarloRunning, fetchAll]);

  const isProjected = tableView === "projected";

  const activeMonteCarlo = useMemo(() => {
    return isProjected ? (monteCarloResult || officialMonteCarloResult) : officialMonteCarloResult;
  }, [isProjected, monteCarloResult, officialMonteCarloResult]);

  const probabilities = useMemo(() => {
    return activeMonteCarlo?.odds ?? [];
  }, [activeMonteCarlo]);

  const teamOdds = useMemo(() => {
    return probabilities.find((p) => p.teamName === selectedTeam);
  }, [probabilities, selectedTeam]);

  const requirements = useMemo(() => {
    if (!selectedTeam || !fullStandings) return null;
    const req = calculateQualificationRequirements(
      selectedTeam,
      baseTeams,
      upcomingMatches,
      fullStandings
    );
    if (!req) return null;
    const team = baseTeams.find((t) => t.name === selectedTeam);
    if (team && teamOdds) {
      req.status = resolveQualificationStatus(
        team,
        baseTeams,
        upcomingMatches,
        fullStandings.projected.standings,
        teamOdds.playoffPercentage
      );
      req.summaries = generateQualificationSummary(req);
    }
    return req;
  }, [selectedTeam, baseTeams, upcomingMatches, fullStandings, teamOdds]);

  const tableRows = fullStandings
    ? isProjected
      ? fullStandings.projectedWithMovement
      : fullStandings.real.standings
    : [];

  if (!baseTeams.length) {
    return (
      <p className="text-sm text-muted-foreground">Loading qualification data...</p>
    );
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Playoff Probability Analytics
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Monte Carlo simulation ({officialMonteCarloResult?.iterations ?? 1000} seasons) with
            weighted match outcomes — not fixed heuristics.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-56">
            <Select
              value={selectedTeam}
              onValueChange={(v) => v && setSelectedTeam(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                {baseTeams.map((t) => (
                  <SelectItem key={t.name} value={t.name}>
                    {getTeamShortName(t.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAll()}
            disabled={monteCarloRunning}
            className="gap-1.5"
          >
            {monteCarloRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Re-run
          </Button>
        </div>
      </section>

      {monteCarloRunning && (
        <Card className="border-emerald-500/30">
          <CardContent className="flex items-center gap-4 py-4">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
            <div className="flex-1">
              <p className="text-sm font-medium">Running Monte Carlo simulation…</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${monteCarloProgress * 100}%` }}
                />
              </div>
            </div>
            <span className="text-sm tabular-nums text-muted-foreground">
              {Math.round(monteCarloProgress * 100)}%
            </span>
          </CardContent>
        </Card>
      )}

      {requirements && teamOdds && !monteCarloRunning && (
        <>
          {teamOdds.insight && (
            <Card
              className={cn(
                "border-emerald-500/20 transition-all duration-300",
                teamOdds.volatility === "high" && "border-orange-500/30 bg-orange-500/5"
              )}
            >
              <CardContent className="py-4 text-sm leading-relaxed text-muted-foreground">
                {teamOdds.insight}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="transition-transform duration-300 hover:-translate-y-0.5">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <Target className="h-3.5 w-3.5" /> Playoff %
                </CardDescription>
                <CardTitle className="text-2xl tabular-nums">
                  {teamOdds.playoffPercentage}%
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <QualificationProbabilityBar
                  percentage={teamOdds.playoffPercentage}
                  confidence={teamOdds.confidence}
                  showLabel={false}
                  animated
                />
                <p className="text-xs text-muted-foreground">
                  95% range: {teamOdds.confidenceRange.low}–{teamOdds.confidenceRange.high}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <Trophy className="h-3.5 w-3.5" /> Top 2 %
                </CardDescription>
                <CardTitle className="text-2xl tabular-nums text-sky-400">
                  {teamOdds.topTwoPercentage}%
                </CardTitle>
              </CardHeader>
              <CardContent>
                <QualificationProbabilityBar
                  percentage={teamOdds.topTwoPercentage}
                  confidence={teamOdds.confidence}
                  showLabel={false}
                  variant="top2"
                  animated
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5" /> Elimination %
                </CardDescription>
                <CardTitle className="text-2xl tabular-nums text-red-400">
                  {teamOdds.eliminationPercentage}%
                </CardTitle>
              </CardHeader>
              <CardContent>
                <QualificationProbabilityBar
                  percentage={teamOdds.eliminationPercentage}
                  confidence={teamOdds.confidence}
                  showLabel={false}
                  variant="elimination"
                  animated
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Volatility</CardDescription>
                <CardTitle className="text-lg">
                  <VolatilityBadge level={teamOdds.volatility} />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                <Badge variant={statusVariant(requirements.status)}>
                  {STATUS_LABELS[requirements.status]}
                </Badge>
                <p className="pt-1">
                  Rank #{requirements.currentRank} · {requirements.currentPoints} pts
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card
              className={cn(
                requirements.nrrPressure === "high" &&
                  "border-amber-500/40 bg-amber-500/5"
              )}
            >
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" /> Scenarios
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>Max possible pts: {requirements.maximumPossiblePoints}</p>
                <p>
                  Need {requirements.requiredWins} win(s) from {requirements.remainingMatches}{" "}
                  left{requirements.nrrPressure === "high" && " (with high margin)"}
                </p>
                <p>Gap to 4th: {requirements.pointsGapToFourth} pts</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> NRR pressure
                </CardDescription>
                <CardTitle className="text-lg capitalize">
                  {requirements.nrrPressure}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Deterministic requirements engine (complements probabilistic odds).
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                Qualification summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {requirements.summaries.map((line, i) => (
                <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                  {line}
                </p>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All teams — Monte Carlo playoff odds</CardTitle>
            <CardDescription>
              {officialMonteCarloResult
                ? `${officialMonteCarloResult.iterations.toLocaleString()} simulated seasons · weighted outcomes`
                : "Run simulation to generate odds"}
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {probabilities.map((p) => (
            <div
              key={p.teamName}
              className={cn(
                "space-y-3 rounded-lg border border-border p-4 transition-all duration-300",
                p.teamName === selectedTeam && "border-emerald-500/50 bg-emerald-500/5",
                p.volatility === "high" && p.teamName !== selectedTeam && "border-orange-500/20"
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {p.playoffPercentage === 0 && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-400/10 border border-red-500/20 px-1.5 py-0.5 rounded">
                      Eliminated
                    </span>
                  )}
                  <span className="font-semibold">{p.shortName}</span>
                  <VolatilityBadge level={p.volatility} />
                </div>
                <div className="flex gap-2">
                  {p.projectedQualified && (
                    <Badge className="bg-emerald-600/20 text-emerald-400">Proj. top 4</Badge>
                  )}
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {p.confidenceRange.low}–{p.confidenceRange.high}%
                  </span>
                </div>
              </div>
              <QualificationProbabilityBar
                percentage={p.playoffPercentage}
                confidence={p.confidence}
                label="Playoff"
              />
              <div className="grid gap-2 sm:grid-cols-2">
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
          ))}
        </CardContent>
      </Card>

      {fullStandings && (
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Standings context</CardTitle>
              <CardDescription>Real vs projected baseline for scenarios</CardDescription>
            </div>
            <StandingsTableToggle
              mode={tableView}
              onChange={setTableView}
              hasPredictions={fullStandings.hasPredictions}
            />
          </CardHeader>
          <CardContent>
            <PointsTable
              rows={tableRows}
              showMovement={isProjected}
              showQualification
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
