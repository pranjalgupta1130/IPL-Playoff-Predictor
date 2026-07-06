import { Request, Response } from "express";
import { Team } from "../models/Team";
import { Match } from "../models/Match";
import { Prediction } from "../models/Prediction";
import { buildFullStandings } from "../services/standingsService";

export async function getStandings(_req: Request, res: Response): Promise<void> {
  try {
    const [teams, matches, predictions] = await Promise.all([
      Team.find().lean(),
      Match.find().lean(),
      Prediction.find().lean(),
    ]);

    const upcoming = matches.filter((m) => !m.completed);
    const result = buildFullStandings(
      teams as unknown as Parameters<typeof buildFullStandings>[0],
      upcoming as unknown as Parameters<typeof buildFullStandings>[1],
      predictions as unknown as Parameters<typeof buildFullStandings>[2]
    );


    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch standings" });
  }
}

export async function getTeams(_req: Request, res: Response): Promise<void> {
  try {
    const teams = await Team.find().sort({ points: -1, nrr: -1 });
    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch teams" });
  }
}
