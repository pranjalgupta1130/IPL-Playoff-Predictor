import { Request, Response } from "express";
import { Match } from "../models/Match";

export async function getMatches(_req: Request, res: Response): Promise<void> {
  try {
    const matches = await Match.find().sort({ date: 1 });
    res.json(matches);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch matches" });
  }
}

export async function getUpcoming(_req: Request, res: Response): Promise<void> {
  try {
    const matches = await Match.find({ completed: false }).sort({ date: 1 });
    res.json(matches);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch upcoming matches" });
  }
}

export async function getCompleted(_req: Request, res: Response): Promise<void> {
  try {
    const matches = await Match.find({ completed: true }).sort({ date: -1 });
    res.json(matches);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch completed matches" });
  }
}
