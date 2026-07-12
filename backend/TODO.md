# IPL Playoff Predictor - Provider-Agnostic Refactor TODO

## Plan (approved)
1. Create provider-agnostic cricket data layer under `backend/src/services/cricketData/`:
   - `providers/sportmonks/`
   - `sync/`
   - `normalization/`
2. Implement Sportmonks provider scaffolding:
   - API client, types, normalization into existing `Match` model fields.
3. Create `syncFixturesToMongo` orchestrator that:
   - upserts teams (using existing `SEED_TEAMS`)
   - fetches fixtures from Sportmonks
   - deletes & inserts into `Match` collection without self matches.
   - supports dev fallback behavior when `SPORTMONKS_API_KEY` is missing (use existing DB seed fixtures).
4. Migrate active architecture entrypoints:
   - Update `backend/src/services/universeService.ts` to use new `syncFixturesToMongo`.
   - Update `backend/src/scripts/seed.ts` to use new `syncFixturesToMongo`.
5. Remove CricAPI naming fully from active flow (COMPLETED):
   - Verified that `services/cricapi/*` implementations are completely removed.
   - Verified that env var usage is updated from `CRICAPI_*` to `SPORTMONKS_*`.
   - Verified that no active runtime imports reference `services/cricapi/*`.
6. Validation:
   - `npm run build`
   - `npm run seed`
   - `npm run dev` (port conflict handled separately)
7. Cleanup verification (COMPLETED):
   - CricAPI references have been completely removed.

## Progress Tracker
- [ ] Step 1: Create new `services/cricketData` folder structure & files
- [ ] Step 2: Implement Sportmonks provider client/types/normalization
- [ ] Step 3: Implement provider-agnostic `syncFixturesToMongo`
- [ ] Step 4: Update `universeService.ts` + `scripts/seed.ts`
- [x] Step 5: Fully migrate/remove CricAPI active flow references + env vars (COMPLETED)
- [ ] Step 6: Build & seed & dev validation
- [x] Step 7: Cleanup verification (no active `cricapi` imports) (COMPLETED)

