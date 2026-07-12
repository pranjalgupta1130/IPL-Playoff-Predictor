import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  lastLogin?: Date;
  totalSimulationsCount: number;
  savedSimulationsCount: number;
  favoriteTeam?: string;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    lastLogin: { type: Date },
    totalSimulationsCount: { type: Number, default: 0 },
    savedSimulationsCount: { type: Number, default: 0 },
    favoriteTeam: { type: String },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
