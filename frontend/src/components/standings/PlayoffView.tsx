import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RankChangeBadge } from "@/components/standings/MovementIndicator";
import type { StandingsRow, StandingsRowWithMovement } from "@/types";
import { cn } from "@/lib/utils";

interface PlayoffViewProps {
  topFour: StandingsRow[];
  outsideQualification: StandingsRow[];
  projectedRows?: StandingsRowWithMovement[];
}

export function PlayoffView({
  topFour,
  outsideQualification,
  projectedRows,
}: PlayoffViewProps) {
  const movementMap = new Map(projectedRows?.map((r) => [r.name, r]));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border-emerald-500/30 bg-emerald-500/5 transition-all duration-300">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            Playoff Zone
            <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Top 4</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {topFour.map((team, i) => {
            const mv = movementMap.get(team.name);
            return (
              <div
                key={team.name}
                className={cn(
                  "flex items-center justify-between rounded-md border border-emerald-500/20 bg-background/50 px-3 py-2 transition-colors duration-300",
                  mv?.enteredPlayoffs && "border-emerald-400/60 bg-emerald-500/10"
                )}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  {i + 1}. {team.shortName}
                  {mv && <RankChangeBadge change={mv.rankChange} />}
                </span>
                <span className="text-xs text-muted-foreground">
                  {team.points} pts · NRR {team.nrr.toFixed(3)}
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="transition-all duration-300">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-muted-foreground">
            Outside Qualification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {outsideQualification.length === 0 ? (
            <p className="text-sm text-muted-foreground">No teams in this zone.</p>
          ) : (
            outsideQualification.map((team) => {
              const mv = movementMap.get(team.name);
              return (
                <div
                  key={team.name}
                  className={cn(
                    "flex items-center justify-between rounded-md border border-border px-3 py-2 transition-colors duration-300",
                    mv?.droppedFromPlayoffs && "border-red-500/40 bg-red-500/5"
                  )}
                >
                  <span className="flex items-center gap-2 text-sm">
                    {team.shortName}
                    {mv && <RankChangeBadge change={mv.rankChange} />}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {team.points} pts · NRR {team.nrr.toFixed(3)}
                  </span>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
