import type { UniverseState } from "../types/universe";

export type UniverseSourceResult = UniverseState;

export type UniverseSource = {
  loadUniverseState: () => Promise<UniverseSourceResult>;
};

