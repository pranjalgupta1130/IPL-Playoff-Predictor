import mongoose, { Document, Schema } from "mongoose";
import { MarginType } from "./Match";

export interface IPrediction extends Document {
  matchId: mongoose.Types.ObjectId;
  predictedWinner: string;
  margin: number;
  marginType: MarginType;
  chaseRuns?: number;
}

const predictionSchema = new Schema<IPrediction>(
  {
    matchId: {
      type: Schema.Types.ObjectId,
      ref: "Match",
      required: true,
      unique: true,
    },
    predictedWinner: { type: String, required: true },
    margin: { type: Number, required: true, min: 1 },
    marginType: {
      type: String,
      enum: [
        "defended_runs",
        "chase_overs",
        "balls_remaining",
        "runs",
        "wickets",
      ],
      required: true,
    },
    chaseRuns: { type: Number },
  },
  { timestamps: true }
);

export const Prediction = mongoose.model<IPrediction>("Prediction", predictionSchema);
