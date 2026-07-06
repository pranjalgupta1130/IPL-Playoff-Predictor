export type NormalizedFixture = {
  /**
   * Optional provider unique fixture identifier.
   * IMPORTANT: this is only populated if provider normalization can confirm a real field.
   */
  fixtureId?: string;
  teamA: string;
  teamB: string;
  date: Date;
  venue: string;
  completed: boolean;
  winner?: string;

  /** Provider-supplied match metadata when available */
  matchNumber?: number | null;
  stage?: string;
};

