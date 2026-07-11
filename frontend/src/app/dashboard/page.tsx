"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StandingsPanel } from "@/components/standings/StandingsPanel";
import { useSimulatorStore } from "@/store/simulatorStore";

export default function DashboardPage() {
  const router = useRouter();

  const {
    loading,
    upcomingMatches,
    fullStandings,
    predictions,
  } = useSimulatorStore();

  useEffect(() => {
    const token = localStorage.getItem("ipl_auth_token");

    if (!token) {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          IPL Playoff Dashboard
        </h1>

        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Analytics and simulation for IPL 2026. The{" "}
          <span className="text-foreground">real table</span> stays fixed;
          switch to{" "}
          <span className="text-emerald-400">projected</span> after
          simulating upcoming matches. See{" "}
          <a
            href="/qualification"
            className="text-emerald-400 underline-offset-4 hover:underline"
          >
            Qualification
          </a>{" "}
          for Monte Carlo playoff % and requirements.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="transition-transform duration-300 hover:-translate-y-0.5">
          <CardHeader className="pb-2">
            <CardDescription>Teams</CardDescription>
            <CardTitle className="text-2xl">10</CardTitle>
          </CardHeader>
        </Card>

        <Card className="transition-transform duration-300 hover:-translate-y-0.5">
          <CardHeader className="pb-2">
            <CardDescription>Upcoming (simulatable)</CardDescription>
            <CardTitle className="text-2xl">
              {upcomingMatches.length}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="transition-transform duration-300 hover:-translate-y-0.5">
          <CardHeader className="pb-2">
            <CardDescription>Active predictions</CardDescription>
            <CardTitle className="text-2xl text-emerald-400">
              {predictions.length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {loading && !fullStandings ? (
        <p className="text-sm text-muted-foreground">
          Loading standings...
        </p>
      ) : (
        <StandingsPanel showReset />
      )}
    </div>
  );
}