"use client";

import { useEffect, useState } from "react";
import { getTeamShortName } from "@/constants/teams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RESULT_TYPE_LABELS } from "@/utils/cricketUtils";
import type { Match, Prediction, PredictionPayload, ResultType } from "@/types";

interface PredictionFormProps {
  match: Match;
  existing?: Prediction;
  onSave: (payload: PredictionPayload) => Promise<void>;
  onClear?: (matchId: string) => Promise<void>;
  loading?: boolean;
}

export function PredictionForm({
  match,
  existing,
  onSave,
  onClear,
  loading,
}: PredictionFormProps) {
  const [winner, setWinner] = useState(existing?.predictedWinner ?? "");
  const [resultType, setResultType] = useState<ResultType>(
    (existing?.marginType as ResultType) ?? "defended_runs"
  );
  const [margin, setMargin] = useState(String(existing?.margin ?? ""));
  const [chaseRuns, setChaseRuns] = useState(
    String(existing?.chaseRuns ?? "")
  );

  useEffect(() => {
    if (existing) {
      setWinner(existing.predictedWinner);
      setResultType(
        existing.marginType === "runs"
          ? "defended_runs"
          : existing.marginType === "wickets"
            ? "balls_remaining"
            : (existing.marginType as ResultType)
      );
      setMargin(String(existing.margin));
      setChaseRuns(existing.chaseRuns ? String(existing.chaseRuns) : "");
    }
  }, [existing]);

  const isChase =
    resultType === "chase_overs" || resultType === "balls_remaining";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!winner || !margin) return;
    const payload: PredictionPayload = {
      matchId: match._id,
      predictedWinner: winner,
      margin: Number(margin),
      marginType: resultType,
    };
    if (isChase && chaseRuns) {
      payload.chaseRuns = Number(chaseRuns);
    }
    await onSave(payload);
  };

  return (
    <Card className="border-dashed transition-all duration-300 hover:border-emerald-500/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base tracking-wide">
            {getTeamShortName(match.teamA)} vs {getTeamShortName(match.teamB)}
          </CardTitle>
          {existing && (
            <Badge variant="outline" className="border-emerald-500/50 text-emerald-400">
              Predicted
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(match.date).toLocaleDateString()} · {match.venue}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Predicted winner</Label>
            <Select value={winner} onValueChange={(v) => v && setWinner(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select winner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={match.teamA}>
                  {getTeamShortName(match.teamA)} — {match.teamA}
                </SelectItem>
                <SelectItem value={match.teamB}>
                  {getTeamShortName(match.teamB)} — {match.teamB}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Win type</Label>
            <Select
              value={resultType}
              onValueChange={(v) => v && setResultType(v as ResultType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(RESULT_TYPE_LABELS) as ResultType[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {RESULT_TYPE_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              {resultType === "defended_runs"
                ? "Runs margin"
                : resultType === "chase_overs"
                  ? "Overs (e.g. 17.3)"
                  : "Balls remaining"}
            </Label>
            <Input
              type="number"
              min={resultType === "chase_overs" ? 0.1 : 1}
              step={resultType === "chase_overs" ? 0.1 : 1}
              placeholder={
                resultType === "defended_runs"
                  ? "25"
                  : resultType === "chase_overs"
                    ? "17.3"
                    : "15"
              }
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
            />
          </div>

          {isChase && (
            <div className="space-y-2">
              <Label>Chase runs (optional)</Label>
              <Input
                type="number"
                min={1}
                placeholder="e.g. 185"
                value={chaseRuns}
                onChange={(e) => setChaseRuns(e.target.value)}
              />
            </div>
          )}

          <div className="flex gap-2 sm:col-span-2">
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={loading || !winner || !margin}
            >
              {existing ? "Update prediction" : "Apply prediction"}
            </Button>
            {existing && onClear && (
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => onClear(match._id)}
              >
                Clear
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
