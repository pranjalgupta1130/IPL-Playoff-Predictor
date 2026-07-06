import type { FullStandingsResult } from "@/types";

export interface UniverseFixture {
  _id: string;
  fixtureId: string;
  matchNumber: number;
  stage: string;
  teamA: string;
  teamB: string;
  date: string;
  venue: string;
  completed: boolean;
}

export interface UniverseApiResponse {
  cutoffMatchNumber: number;
  completedCount: number;
  upcomingCount: number;
  upcomingFixtures: UniverseFixture[];
}

export interface QualificationApiResponse {
  probabilities: import("@/types").QualificationProbability[];
  monteCarlo: import("@/types").MonteCarloResult;
  standings: FullStandingsResult & {
    real: import("@/types").StandingsBundle;
    projected: import("@/types").StandingsBundle;
    projectedWithMovement: import("@/types").StandingsRowWithMovement[];
    hasPredictions: boolean;
  };
}

