import { sportmonksFetchFixtures } from "../sportmonksApiClient";
import { normalizeSportmonksFixturesToMatches } from "../normalization/normalizeSportmonksFixtures";

export async function sportmonksSyncFixtures(): Promise<
  Array<{
    fixtureId?: string;
    teamA: string;
    teamB: string;
    date: Date;
    venue: string;
    completed: boolean;
    winner?: string;
  }>
> {
  const raw = await sportmonksFetchFixtures();
  const normalized = normalizeSportmonksFixturesToMatches(raw);
  return normalized;
}

