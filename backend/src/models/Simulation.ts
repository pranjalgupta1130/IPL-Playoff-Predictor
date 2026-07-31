import mongoose, { Document, Schema } from "mongoose";

export interface ISimulation extends Document {
  shareId: string;
  owner?: mongoose.Types.ObjectId | null;
  predictions: any;
  completedMatchesSnapshot: any;
  generatedStandings: any;
  qualificationResults?: any;
  playoffProbabilities: any;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const simulationSchema = new Schema<ISimulation>(
  {
    shareId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    predictions: {
      type: Schema.Types.Mixed,
      required: true,
    },
    completedMatchesSnapshot: {
      type: Schema.Types.Mixed,
      required: true,
    },
    generatedStandings: {
      type: Schema.Types.Mixed,
      required: true,
    },
    qualificationResults: {
      type: Schema.Types.Mixed,
      default: null,
    },
    playoffProbabilities: {
      type: Schema.Types.Mixed,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Enforce immutability for saved simulation snapshots
simulationSchema.pre("updateOne", function () {
  throw new Error("Simulation snapshots are immutable and cannot be updated.");
});

simulationSchema.pre("findOneAndUpdate", function () {
  throw new Error("Simulation snapshots are immutable and cannot be updated.");
});

export const Simulation =
  mongoose.models.Simulation ||
  mongoose.model<ISimulation>("Simulation", simulationSchema);
