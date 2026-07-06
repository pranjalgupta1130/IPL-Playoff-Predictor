import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { VolatilityLevel } from "@/types";
import { Activity, Minus, TrendingUp } from "lucide-react";

const CONFIG: Record<
  VolatilityLevel,
  { label: string; className: string; Icon: typeof Activity }
> = {
  low: {
    label: "Stable",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    Icon: Minus,
  },
  medium: {
    label: "Moderate",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    Icon: TrendingUp,
  },
  high: {
    label: "Volatile",
    className: "border-orange-500/40 bg-orange-500/10 text-orange-300",
    Icon: Activity,
  },
};

export function VolatilityBadge({ level }: { level: VolatilityLevel }) {
  const { label, className, Icon } = CONFIG[level];
  return (
    <Badge variant="outline" className={cn("gap-1", className)}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}
