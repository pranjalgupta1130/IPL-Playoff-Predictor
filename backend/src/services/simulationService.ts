import { randomBytes } from "crypto";
import { Simulation, ISimulation } from "../models/Simulation";
import { User } from "../models/User";

const NANOID_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/**
 * Generate a unique, URL-safe, non-sequential, collision-resistant share ID.
 */
export function generateShareId(size = 12): string {
  const bytes = randomBytes(size);
  let id = "";
  for (let i = 0; i < size; i++) {
    id += NANOID_ALPHABET[bytes[i] % NANOID_ALPHABET.length];
  }
  return id;
}

export interface SaveSimulationInput {
  predictions: any;
  completedMatchesSnapshot: any;
  generatedStandings: any;
  qualificationResults?: any;
  playoffProbabilities: any;
  metadata?: Record<string, any>;
}

/**
 * Saves a complete simulation snapshot directly without recomputing standings or Monte Carlo probabilities.
 */
export async function saveSimulationSnapshot(
  input: SaveSimulationInput,
  ownerId?: string
): Promise<ISimulation> {
  const {
    predictions,
    completedMatchesSnapshot,
    generatedStandings,
    qualificationResults,
    playoffProbabilities,
    metadata,
  } = input;

  // Validate required snapshot fields
  if (!predictions || (Array.isArray(predictions) && predictions.length === 0 && typeof predictions !== "object")) {
    throw new Error("Missing or invalid predictions in simulation payload");
  }
  if (!completedMatchesSnapshot) {
    throw new Error("Missing completedMatchesSnapshot in simulation payload");
  }
  if (!generatedStandings) {
    throw new Error("Missing generatedStandings in simulation payload");
  }
  if (!playoffProbabilities) {
    throw new Error("Missing playoffProbabilities in simulation payload");
  }

  // Ensure unique shareId generation
  let shareId = generateShareId();
  let attempts = 0;
  while (await Simulation.exists({ shareId })) {
    shareId = generateShareId();
    attempts++;
    if (attempts > 5) {
      throw new Error("Failed to generate a unique share ID");
    }
  }

  const simulation = new Simulation({
    shareId,
    owner: ownerId || null,
    predictions,
    completedMatchesSnapshot,
    generatedStandings,
    qualificationResults: qualificationResults ?? null,
    playoffProbabilities,
    metadata: metadata ?? {},
  });

  await simulation.save();

  // If authenticated user saved this simulation, update savedSimulationsCount
  if (ownerId) {
    try {
      await User.findByIdAndUpdate(ownerId, {
        $inc: { savedSimulationsCount: 1 },
      });
    } catch (err) {
      // Non-blocking user count update failure
      console.warn("Failed to update user savedSimulationsCount:", err);
    }
  }

  return simulation;
}

/**
 * Load saved simulation snapshot directly from MongoDB by shareId.
 * ARCHITECTURAL DESIGN NOTES:
 * 1. Immutability: Simulations never change after creation.
 * 2. Performance: Retrieval bypasses Monte Carlo & standings recalculations, loading the pre-computed snapshot.
 * 3. Clone-on-edit: Viewers editing a shared link spawn a local simulation copy rather than mutating this original snapshot.
 * 4. Reuse UI: The frontend reuses the exact same simulator components in read-only mode to render snapshots.
 */
export async function getSimulationByShareId(
  shareId: string
): Promise<ISimulation | null> {
  if (!shareId || typeof shareId !== "string" || shareId.trim() === "") {
    return null;
  }

  // =========================================================================
  // TODO: Redis Caching Integration Point
  // -------------------------------------------------------------------------
  // Immutable simulation snapshots are 100% ideal candidates for Redis caching.
  // Because saved simulations NEVER change post-creation (enforced by Mongoose pre-update hooks),
  // cached entries have a 100% cache-hit effectiveness with zero cache-invalidation overhead.
  //
  // Future Redis Implementation Blueprint:
  // 1. const cacheKey = `simulation:${shareId.trim()}`;
  // 2. const cached = await redis.get(cacheKey);
  // 3. if (cached) return JSON.parse(cached);
  // 4. const simulation = await Simulation.findOne({ shareId: shareId.trim() }).lean();
  // 5. if (simulation) await redis.set(cacheKey, JSON.stringify(simulation), "EX", 86400 * 30); // 30-day TTL
  // =========================================================================

  const simulation = await Simulation.findOne({ shareId: shareId.trim() }).lean();
  return simulation as ISimulation | null;
}

/**
 * Retrieves all saved simulations owned by a specific user, sorted newest first.
 */
export async function getSimulationsByOwner(
  ownerId: string
): Promise<ISimulation[]> {
  if (!ownerId) return [];
  const simulations = await Simulation.find({ owner: ownerId })
    .sort({ createdAt: -1 })
    .lean();
  return simulations as ISimulation[];
}

/**
 * Deletes a saved simulation by shareId ONLY if owned by the specified user.
 * Decrements the user's savedSimulationsCount.
 */
export async function deleteSimulationByShareIdAndOwner(
  shareId: string,
  ownerId: string
): Promise<boolean> {
  if (!shareId || !ownerId) return false;

  const simulation = await Simulation.findOneAndDelete({
    shareId: shareId.trim(),
    owner: ownerId,
  });

  if (!simulation) {
    return false;
  }

  // Decrement user savedSimulationsCount
  try {
    await User.findByIdAndUpdate(ownerId, {
      $inc: { savedSimulationsCount: -1 },
    });
  } catch (err) {
    console.warn("Failed to decrement user savedSimulationsCount:", err);
  }

  return true;
}

