import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DeltaText, RankChangeBadge } from "@/components/standings/MovementIndicator";
import type { StandingsRow, StandingsRowWithMovement } from "@/types";
import { cn } from "@/lib/utils";

interface PointsTableProps {
  rows: StandingsRow[] | StandingsRowWithMovement[];
  showQualification?: boolean;
  showMovement?: boolean;
  animate?: boolean;
}

function isMovementRow(row: StandingsRow): row is StandingsRowWithMovement {
  return "rankChange" in row;
}

export function PointsTable({
  rows,
  showQualification = true,
  showMovement = false,
  animate = true,
}: PointsTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-12">#</TableHead>
            {showMovement && <TableHead className="w-14">Δ</TableHead>}
            <TableHead>Team</TableHead>
            <TableHead className="text-center">M</TableHead>
            <TableHead className="text-center">W</TableHead>
            <TableHead className="text-center">L</TableHead>
            <TableHead className="text-center">Pts</TableHead>
            <TableHead className="text-right">NRR</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((team, index) => {
            const movement = isMovementRow(team) ? team : null;
            return (
              <TableRow
                key={team.name}
                className={cn(
                  "transition-colors duration-300",
                  animate && "animate-in fade-in slide-in-from-bottom-1",
                  team.qualified && showQualification && "bg-emerald-500/5",
                  movement?.enteredPlayoffs && "ring-1 ring-emerald-500/40",
                  movement?.droppedFromPlayoffs && "ring-1 ring-red-500/30"
                )}
                style={animate ? { animationDelay: `${index * 40}ms` } : undefined}
              >
                <TableCell className="font-medium text-muted-foreground">
                  {team.rank ?? index + 1}
                </TableCell>
                {showMovement && movement && (
                  <TableCell>
                    <RankChangeBadge change={movement.rankChange} />
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold tracking-wide">{team.shortName}</span>
                    <span className="hidden text-muted-foreground sm:inline">{team.name}</span>
                    {showQualification && team.qualified && (
                      <Badge className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/20">
                        Q
                      </Badge>
                    )}
                    {movement?.enteredPlayoffs && (
                      <Badge className="border-emerald-500/50 bg-emerald-500/10 text-emerald-300">
                        In
                      </Badge>
                    )}
                    {movement?.droppedFromPlayoffs && (
                      <Badge className="border-red-500/50 bg-red-500/10 text-red-300">
                        Out
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">{team.played}</TableCell>
                <TableCell className="text-center">{team.wins}</TableCell>
                <TableCell className="text-center">{team.losses}</TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="font-semibold">{team.points}</span>
                    {showMovement && movement && movement.pointsDelta !== 0 && (
                      <DeltaText value={movement.pointsDelta} suffix=" pts" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end gap-0.5">
                    <span
                      className={cn(
                        "font-mono text-sm",
                        team.nrr >= 0 ? "text-emerald-400" : "text-red-400"
                      )}
                    >
                      {team.nrr > 0 ? "+" : ""}
                      {team.nrr.toFixed(3)}
                    </span>
                    {showMovement && movement && movement.nrrDelta !== 0 && (
                      <DeltaText value={movement.nrrDelta} />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
