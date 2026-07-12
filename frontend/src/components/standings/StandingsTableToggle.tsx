"use client";

import { cn } from "@/lib/utils";
import type { TableViewMode } from "@/types";

interface StandingsTableToggleProps {
  mode: TableViewMode;
  onChange: (mode: TableViewMode) => void;
  hasPredictions: boolean;
}

export function StandingsTableToggle({
  mode,
  onChange,
  hasPredictions,
}: StandingsTableToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
      <button
        type="button"
        onClick={() => onChange("real")}
        className={cn(
          "rounded-md px-4 py-2 text-sm font-medium transition-all duration-200",
          mode === "real"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Real Table
      </button>
      <button
        type="button"
        onClick={() => onChange("projected")}
        className={cn(
          "rounded-md px-4 py-2 text-sm font-medium transition-all duration-200",
          mode === "projected"
            ? "bg-emerald-600 text-white shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Projected Table
      </button>
    </div>
  );
}
