import { Team } from "../../../models/Team";
import { Match } from "../../../models/Match";
import { SEED_TEAMS } from "../../../data/seedData";
import { getCricketDataProvider } from "../providers";
import { validateAndSummarizeFixtures } from "../validation/validateAndSummarizeFixtures";
import type { NormalizedFixture } from "../types/NormalizedFixture";



async function upsertTeamsFromSeed(): Promise<void> {
  // Team naming must exactly match Match.teamA/teamB for elimination logic.
  await Team.deleteMany({});
  await Team.insertMany(SEED_TEAMS as any);
}

/**
 * Provider-agnostic fixture sync.
 *
 * Active flow requirement:
 * - always keep analytics (Monte Carlo / qualification / standings) unchanged
 * - populate Match collection with normalized fixtures
 * - prevent self matches
 */
export async function syncFixturesToMongo(): Promise<void> {
  const mode = process.env.NODE_ENV || "development";
  const isDev = mode !== "production";

  // Provider availability gate (no synthetic fixtures, no silent fallback)
  if (!process.env.SPORTMONKS_API_KEY) {
    if (!isDev) {
      throw new Error("SPORTMONKS_API_KEY missing in production: refusing to use synthetic fallback fixtures.");
    }
    await upsertTeamsFromSeed();
    return;
  }

  try {

    const provider = getCricketDataProvider();

    // 1) Provider fetch + provider-specific normalization (still inside provider)
    const providerFixtures = await provider.fetchFixtures();

    // 2) Validate normalized fixtures BEFORE touching Mongo
    const { valid, summary } = validateAndSummarizeFixtures(
      providerFixtures as unknown as NormalizedFixture[],
      { maxFixtures: 2000 }
    );

    // Print summary for observability
    console.log("[cricketData sync validation summary]", summary);

    if (!valid.length) {
      throw new Error(
        "Validation rejected all fixtures (final set is empty). Refusing to modify MongoDB."
      );
    }

    // 3) Only after validation succeeds: replace MongoDB fixtures
    await Match.deleteMany({});

    const docs = valid.map((m) => {
      const completed = !!m.completed;
      return {
        fixtureId: m.fixtureId,
        matchNumber: (m as any).matchNumber ?? null,
        stage: (m as any).stage,

        teamA: m.teamA,
        teamB: m.teamB,
        date: m.date,
        venue: m.venue,
        completed,
        winner: completed ? (m.winner ?? "") : undefined,
        // margin/marginType must be set by upstream provider.
        // For legacy static JSON, it may still be missing; baseline NRR reconstruction will enforce sufficiency.
        margin: (m as any).margin ?? undefined,
        marginType: (m as any).marginType ?? undefined,
      };
    });

    await Match.insertMany(docs as any);
  } catch (e) {
    if (isDev) {
      // In dev, keep runtime stable by not corrupting DB.
      console.error("[cricketData sync] failed; preserving existing MongoDB fixtures:", e);
      await upsertTeamsFromSeed();
      return;
    }
    throw e;
  }
}


