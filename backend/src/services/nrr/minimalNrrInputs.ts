import { IMatch } from "../../models/Match";

export type NrrInputsSufficiency = {
  hasRequiredFields: boolean;
  missingForCompleted: Array<{
    matchId: string;
    matchNumber?: number | null;
    missing: string[];
  }>;
};

export function checkNrrReconstructionSufficiency(
  completedMatches: IMatch[]
): NrrInputsSufficiency {
  const missingForCompleted: Array<{ matchId: string; matchNumber?: number | null; missing: string[] }> = [];

  for (const m of completedMatches) {
    if (!m.completed) continue;

    const missing: string[] = [];

    const isNoResult = !m.winner;
    const isSuperOver = !!m.winner && (m.margin == null || m.marginType == null);

    // Legitimate special cases accepted by baseline reconstruction:
    // - No Result: winner absent, points split; no NRR deltas.
    // - Super Over: winner preserved, but our simplified NRR engine skips regulation margin.
    if (isNoResult) {
      continue;
    }

    if (isSuperOver) {
      continue;
    }

    if (!m.winner) missing.push("winner");
    if (m.margin == null) missing.push("margin");
    if (!m.marginType) missing.push("marginType");


    if (missing.length > 0) {
      missingForCompleted.push({
        matchId: m._id.toString(),
        matchNumber: m.matchNumber,
        missing,
      });
    }
  }

  return {
    hasRequiredFields: missingForCompleted.length === 0,
    missingForCompleted,
  };
}

