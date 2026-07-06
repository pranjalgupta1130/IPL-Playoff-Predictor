import mongoose, { Document, Schema } from "mongoose";

export interface ITeam extends Document {
  name: string;
  shortName: string;
  played: number;
  wins: number;
  losses: number;
  points: number;
  nrr: number;
}

const teamSchema = new Schema<ITeam>(
  {
    name: { type: String, required: true, unique: true },
    shortName: { type: String, required: true },
    played: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    nrr: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Team = mongoose.model<ITeam>("Team", teamSchema);
