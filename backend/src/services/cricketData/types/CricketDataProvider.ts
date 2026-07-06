export type ProviderFixture = {
  /** Provider-supplied unique identifier if available */
  fixtureId?: string;
  teamA: string;
  teamB: string;
  date: Date;
  venue: string;
  /** Provider completion status already normalized by provider layer */
  completed: boolean;
  winner?: string;
  /** Provider match result deltas when available */
  margin?: number;
  marginType?: string;

  /** Provider match metadata when available */
  matchNumber?: number | null;
  stage?: string;
};

export interface CricketDataProvider {
  fetchFixtures(): Promise<ProviderFixture[]>;
}

