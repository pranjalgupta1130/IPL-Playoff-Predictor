import type { CricketDataProvider } from "../types/CricketDataProvider";
import { SportmonksCricketDataProvider } from "./sportmonks/sportmonksProvider";
import { StaticDatasetCricketDataProvider } from "./staticDataset";

export function getCricketDataProvider(): CricketDataProvider {
  const mode = String(process.env.CRICKET_DATA_PROVIDER ?? "").trim().toLowerCase();

  if (mode === "static") {
    return new StaticDatasetCricketDataProvider();
  }

  if (mode === "sportmonks") {
    return new SportmonksCricketDataProvider();
  }

  // Provider selection must be explicit (no silent fallbacks).
  if (!mode) {
    throw new Error(
      "No cricket data provider configured: set CRICKET_DATA_PROVIDER=static or CRICKET_DATA_PROVIDER=sportmonks."
    );
  }

  throw new Error(`Unknown CRICKET_DATA_PROVIDER='${mode}'. Use 'static' or 'sportmonks'.`);
}


