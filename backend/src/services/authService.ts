import bcrypt from "bcrypt";
import { User } from "../models/User";

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  favouriteTeam?: string;
}): Promise<{ id: string; name: string; email: string; favouriteTeam?: string }> {
  const { name, email, password, favouriteTeam } = input;

  const normalizedEmail = email.trim().toLowerCase();

  const existing = await User.findOne({ email: normalizedEmail }).lean();
  if (existing) {
    const err = new Error("Email already in use");
    (err as any).statusCode = 409;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    favouriteTeam: favouriteTeam?.trim() || undefined,
  });

  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    favouriteTeam: user.favouriteTeam,
  };
}

import { signAccessToken } from "./jwtService";

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<{ token: string; user: { id: string; name: string; email: string; favouriteTeam?: string } }> {
  const { email, password } = input;
  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail }).lean();

  if (!user) {
    const err = new Error("Invalid email or password");
    (err as any).statusCode = 401;
    throw err;
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    const err = new Error("Invalid email or password");
    (err as any).statusCode = 401;
    throw err;
  }

  const token = signAccessToken({
    sub: String(user._id),
    email: user.email,
    name: user.name,
    favouriteTeam: user.favouriteTeam,
  });

  return {
    token,
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      favouriteTeam: user.favouriteTeam,
    },
  };
}


