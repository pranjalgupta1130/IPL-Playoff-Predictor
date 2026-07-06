import type { CricketDataProvider, ProviderFixture } from "../../types/CricketDataProvider";
import { sportmonksFetchFixtures } from "./sportmonksApiClient";
import { normalizeSportmonksFixturesToMatches } from "./normalization/normalizeSportmonksFixtures";

export class SportmonksCricketDataProvider implements CricketDataProvider {
  async fetchFixtures(): Promise<ProviderFixture[]> {
    const raw = await sportmonksFetchFixtures();

    const normalized = normalizeSportmonksFixturesToMatches(raw);

    // Normalization output is already in the generic provider fixture shape.
    return normalized.map((m) => ({
      fixtureId: m.fixtureId,
      teamA: m.teamA,
      teamB: m.teamB,
      date: m.date,
      venue: m.venue,
      completed: m.completed,
      winner: m.winner,
    }));
  }
}

