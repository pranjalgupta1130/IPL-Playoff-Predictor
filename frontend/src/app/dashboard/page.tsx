"use client";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StandingsPanel } from "@/components/standings/StandingsPanel";
import { useSimulatorStore } from "@/store/simulatorStore";
import { useAuthStore } from "@/store/authStore";
import { Play, ClipboardCheck, Save, Clock, Heart } from "lucide-react";

export default function HomePage() {
  const { loading, upcomingMatches, fullStandings, predictions } = useSimulatorStore();
  const { user } = useAuthStore();

  const favTeamName = user?.favoriteTeam || "Chennai Super Kings";
  const favTeamRow = fullStandings?.real?.standings?.find(
    (t) => t.name === favTeamName
  );

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          IPL Playoff Dashboard
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Analytics and simulation for IPL 2026. The{" "}
          <span className="text-foreground">real table</span> stays fixed; switch to{" "}
          <span className="text-emerald-400">projected</span> after simulating upcoming
          matches. See{" "}
          <a href="/qualification" className="text-emerald-400 underline-offset-4 hover:underline">
            Qualification
          </a>{" "}
          for Monte Carlo playoff % and requirements.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md border-emerald-500/10">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Play className="h-3.5 w-3.5 text-emerald-400" />
              Total Simulations
            </CardDescription>
            <CardTitle className="text-3xl font-mono">{user?.totalSimulationsCount ?? 0}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md border-emerald-500/10">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <ClipboardCheck className="h-3.5 w-3.5 text-emerald-400" />
              Current Predictions
            </CardDescription>
            <CardTitle className="text-3xl font-mono text-emerald-400">{predictions.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md border-emerald-500/10">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Save className="h-3.5 w-3.5 text-emerald-400" />
              Saved Simulations
            </CardDescription>
            <CardTitle className="text-3xl font-mono">{user?.savedSimulationsCount ?? 0}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md border-emerald-500/10">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Heart className="h-3.5 w-3.5 text-emerald-400 fill-emerald-400/20" />
              Fav Team Insights
            </CardDescription>
            <div className="pt-1 space-y-0.5">
              <CardTitle className="text-sm font-semibold text-foreground truncate">
                {favTeamRow?.shortName || favTeamName}
              </CardTitle>
              {favTeamRow ? (
                <div className="text-xs text-muted-foreground leading-tight space-y-0.5">
                  <p className="font-semibold text-emerald-400">
                    Rank #{favTeamRow.rank} &bull; {favTeamRow.points} Pts
                  </p>
                  <p>
                    {favTeamRow.wins}W - {favTeamRow.losses}L ({favTeamRow.played} Pl)
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground/80">
                    NRR: {favTeamRow.nrr > 0 ? "+" : ""}{favTeamRow.nrr.toFixed(3)}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No data available</p>
              )}
            </div>
          </CardHeader>
        </Card>
      </div>

      {loading && !fullStandings ? (
        <p className="text-sm text-muted-foreground">Loading standings...</p>
      ) : (
        <StandingsPanel showReset />
      )}
    </div>
  );
}
