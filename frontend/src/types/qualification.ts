export type QualificationStatus =
  | "qualified"
  | "strong_favorite"
  | "likely"
  | "in_contention"
  | "must_win"
  | "nrr_battle"
  | "mathematically_alive"
  | "eliminated";

export type NrrPressure = "low" | "medium" | "high";
export type ConfidenceLevel = "high" | "medium" | "low";
export type VolatilityLevel = "low" | "medium" | "high";

export interface QualificationRequirements {
  teamName: string;
  shortName: string;
  currentPoints: number;
  currentRank: number;
  remainingMatches: number;
  maximumPossiblePoints: number;
  requiredWins: number;
  pointsGapToFourth: number;
  status: QualificationStatus;
  nrrPressure: NrrPressure;
  summaries: string[];
  dependencies: string[];
  projectedQualified: boolean;
}

export interface QualificationProbability {
  teamName: string;
  shortName: string;
  percentage: number;
  playoffPercentage: number;
  topTwoPercentage: number;
  eliminationPercentage: number;
  volatility: VolatilityLevel;
  confidenceRange: { low: number; high: number };
  confidence: ConfidenceLevel;
  projectedQualified: boolean;
  rank: number;
  insight?: string;
  mathematicallyEliminated?: boolean;
  mathematicallyQualified?: boolean;
}

// Inherits all fields from QualificationProbability.
export type MonteCarloTeamOdds = QualificationProbability;


export interface MonteCarloResult {
  iterations: number;
  odds: MonteCarloTeamOdds[];
  completedAt: number;
  method: "monte_carlo";
}
