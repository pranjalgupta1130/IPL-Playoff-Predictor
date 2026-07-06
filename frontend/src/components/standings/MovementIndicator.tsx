import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export function RankChangeBadge({ change }: { change: number }) {
  if (change === 0) {
    return (
      <span className="inline-flex items-center text-muted-foreground">
        <Minus className="h-3.5 w-3.5" aria-hidden />
      </span>
    );
  }

  const up = change > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        up ? "text-emerald-400" : "text-red-400"
      )}
      title={up ? `Moved up ${change} place(s)` : `Dropped ${Math.abs(change)} place(s)`}
    >
      {up ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
      {Math.abs(change)}
    </span>
  );
}

export function DeltaText({
  value,
  suffix = "",
}: {
  value: number;
  suffix?: string;
}) {
  if (value === 0) return <span className="text-muted-foreground">—</span>;

  const positive = value > 0;
  return (
    <span className={cn("text-xs font-medium", positive ? "text-emerald-400" : "text-red-400")}>
      {positive ? "+" : ""}
      {value}
      {suffix}
    </span>
  );
}
