"use client";

import { cn } from "@/lib/utils";
import type { ConfidenceLevel } from "@/types";

interface QualificationProbabilityBarProps {
  percentage: number;
  confidence: ConfidenceLevel;
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  variant?: "playoff" | "top2" | "elimination";
}

function barColor(pct: number, variant: QualificationProbabilityBarProps["variant"]): string {
  if (variant === "elimination") {
    if (pct >= 50) return "bg-red-500/90";
    return "bg-red-500/50";
  }
  if (variant === "top2") {
    if (pct >= 60) return "bg-sky-500";
    return "bg-sky-500/60";
  }
  if (pct >= 65) return "bg-emerald-500";
  if (pct >= 35) return "bg-amber-500";
  return "bg-red-500/80";
}

export function QualificationProbabilityBar({
  percentage,
  confidence,
  showLabel = true,
  label = "Playoff",
  animated = true,
  variant = "playoff",
}: QualificationProbabilityBarProps) {
  const displayConfidence = percentage >= 70 ? "high" : percentage >= 30 ? "moderate" : "low";

  return (
    <div className="space-y-1.5">
      {showLabel && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {label} · <span className="capitalize">{displayConfidence}</span>
          </span>
          <span
            className={cn(
              "font-semibold tabular-nums transition-colors duration-300",
              variant === "playoff" && percentage >= 65 && "text-emerald-400",
              variant === "playoff" && percentage >= 35 && percentage < 65 && "text-amber-400",
              variant === "playoff" && percentage < 35 && "text-red-400",
              variant === "top2" && "text-sky-400",
              variant === "elimination" && "text-red-400"
            )}
          >
            {percentage}%
          </span>
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full",
            barColor(percentage, variant),
            animated && "transition-all duration-700 ease-out"
          )}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
    </div>
  );
}
