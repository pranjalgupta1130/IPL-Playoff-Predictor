import { Request, Response } from "express";
import { loadUniverseState } from "../services/universeService";

export async function getTeams(_req: Request, res: Response): Promise<void> {
  try {
    const universe = await loadUniverseState();
    res.json(universe.simulation.fullStandings.real.standings);
  } catch (error: any) {
    console.error("Error in getTeams:", error);
    res.status(500).json({ message: "Failed to get teams", error: error?.message ?? String(error) });
  }
}

export async function getStandings(_req: Request, res: Response): Promise<void> {
  try {
    const universe = await loadUniverseState();
    res.json(universe.simulation.fullStandings);
  } catch (error: any) {
    console.error("Error in getStandings:", error);
    res.status(500).json({ message: "Failed to get standings", error: error?.message ?? String(error) });
  }
}
