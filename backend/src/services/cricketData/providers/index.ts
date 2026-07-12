import type { CricketDataProvider } from "../types/CricketDataProvider";
import { StaticDatasetCricketDataProvider } from "./staticDataset";

export function getCricketDataProvider(): CricketDataProvider {
  // Always use the local static IPL 2026 dataset
  return new StaticDatasetCricketDataProvider();
}


