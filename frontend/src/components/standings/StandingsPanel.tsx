"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PointsTable } from "@/components/standings/PointsTable";
import { PlayoffView } from "@/components/standings/PlayoffView";
import { StandingsTableToggle } from "@/components/standings/StandingsTableToggle";
import { useSimulatorStore } from "@/store/simulatorStore";
import { RotateCcw } from "lucide-react";

interface StandingsPanelProps {
  title?: string;
  description?: string;
  showReset?: boolean;
}

export function StandingsPanel({
  title = "Points Table",
  description = "Sorted by points, then NRR",
  showReset = false,
}: StandingsPanelProps) {
  const {
    fullStandings,
    tableView,
    setTableView,
    resetAllPredictions,
    predictions,
  } = useSimulatorStore();

  if (!fullStandings) return null;

  const isProjected = tableView === "projected";

  // Use movement rows when available.
  // Otherwise fall back to the backend-authoritative projected standings.
  const projectedRows =
    fullStandings.projectedWithMovement?.length
      ? fullStandings.projectedWithMovement
      : fullStandings.projected.standings;

  const rows = isProjected
    ? projectedRows
    : fullStandings.real.standings;

  const playoff = isProjected
    ? fullStandings.projected
    : fullStandings.real;

  return (
    <div className="space-y-6">
      <Card className="transition-shadow duration-300 hover:shadow-lg hover:shadow-emerald-950/20">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{title}</CardTitle>

            <CardDescription>
              {isProjected
                ? "Includes your simulated results — compare vs real table"
                : description}
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StandingsTableToggle
              mode={tableView}
              onChange={setTableView}
              hasPredictions={fullStandings.hasPredictions}
            />

            {showReset && predictions.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => resetAllPredictions()}
                disabled={false}
                className="gap-1.5"
              >
                <RotateCcw className="h-4 w-4" />
                Reset all
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <PointsTable
            rows={rows}
            showMovement={isProjected}
            showQualification
          />
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-4 text-xl font-semibold tracking-tight">
          Playoff Qualification

          {isProjected && (
            <span className="ml-2 text-sm font-normal text-emerald-400">
              (Projected)
            </span>
          )}
        </h2>

        <PlayoffView
          topFour={playoff.topFour}
          outsideQualification={playoff.outsideQualification}
          projectedRows={
          isProjected && fullStandings.projectedWithMovement?.length
          ? fullStandings.projectedWithMovement
          : undefined
          }
        />
      </section>
    </div>
  );
}