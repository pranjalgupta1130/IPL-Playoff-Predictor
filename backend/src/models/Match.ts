import mongoose, { Document, Schema } from "mongoose";
import { ResultType } from "../types/cricket";

export type MarginType = ResultType | "runs" | "wickets";

export interface IMatch extends Document {
  fixtureId?: string;
  matchNumber?: number | null;
  stage?: string;

  teamA: string;
  teamB: string;
  date: Date;
  venue: string;
  completed: boolean;
  winner?: string;
  margin?: number;
  marginType?: MarginType;
  chaseRuns?: number;
}

const matchSchema = new Schema<IMatch>(
  {
    fixtureId: { type: String, unique: true, sparse: true },
    matchNumber: { type: Number, default: null },
    stage: { type: String },

    teamA: { type: String, required: true },
    teamB: { type: String, required: true },
    date: { type: Date, required: true },
    venue: { type: String, required: true },
    completed: { type: Boolean, default: false },
    winner: { type: String },
    margin: { type: Number },
    marginType: {
      type: String,
      enum: [
        "defended_runs",
        "chase_overs",
        "balls_remaining",
        "runs",
        "wickets",
      ],
    },
    chaseRuns: { type: Number },
  },
  { timestamps: true }
);

export const Match = mongoose.model<IMatch>("Match", matchSchema);
