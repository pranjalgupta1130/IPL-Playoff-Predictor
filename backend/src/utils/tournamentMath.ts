import { POINTS_PER_WIN } from "../constants/tournament";

export function getMaximumPossiblePoints(
  currentPoints: number,
  remainingMatches: number
): number {
  return currentPoints + remainingMatches * POINTS_PER_WIN;
}
