import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTeamShortName } from "@/constants/teams";
import { formatResultSummary } from "@/utils/cricketUtils";
import type { Match } from "@/types";

interface MatchCardProps {
  match: Match;
}

export function MatchCard({ match }: MatchCardProps) {
  const date = new Date(match.date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Card className="transition-all duration-300 hover:border-emerald-500/30 hover:shadow-md hover:shadow-emerald-950/10">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold tracking-wide">
          {getTeamShortName(match.teamA)} vs {getTeamShortName(match.teamB)}
        </CardTitle>
        <Badge variant={match.completed ? "secondary" : "default"}>
          {match.completed ? "Completed" : "Upcoming"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-1 text-sm text-muted-foreground">
        <p className="text-foreground">
          {match.teamA} vs {match.teamB}
        </p>
        <p>{date}</p>
        <p>{match.venue}</p>
        {match.completed && match.winner && match.margin != null && (
          <p className="pt-1 text-emerald-400">
            {formatResultSummary(
              match.marginType,
              match.margin,
              getTeamShortName(match.winner),
              match.chaseRuns
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
