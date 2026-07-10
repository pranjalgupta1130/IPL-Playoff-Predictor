import { Request, Response } from "express";
import { loginUser, registerUser } from "../services/authService";

function getErrorStatus(err: unknown): number {
  return typeof (err as any)?.statusCode === "number" ? (err as any).statusCode : 500;
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password, confirmPassword, favouriteTeam } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
      favouriteTeam?: string;
    };

    if (!name || !email || !password || !confirmPassword) {
      res.status(400).json({ message: "name, email, password, and confirmPassword are required" });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).json({ message: "password and confirmPassword do not match" });
      return;
    }

    const result = await registerUser({
      name,
      email,
      password,
      favouriteTeam,
    });

    res.status(201).json({ message: "User registered successfully", user: result });
  } catch (err) {
    const status = getErrorStatus(err);
    const message = (err as Error)?.message || "Registration failed";
    res.status(status).json({ message });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ message: "email and password are required" });
      return;
    }

    const result = await loginUser({ email, password });
    res.json({ message: "Login successful", token: result.token, user: result.user });
  } catch (err) {
    const status = getErrorStatus(err);
    const message = (err as Error)?.message || "Login failed";
    res.status(status).json({ message });
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: "Missing authenticated user" });
      return;
    }

    res.json({
      message: "Authenticated",
      user: {
        id: user.sub,
        name: user.name,
        email: user.email,
        favouriteTeam: user.favouriteTeam,
      },
    });
  } catch {
    res.status(500).json({ message: "Failed to fetch authenticated user" });
  }
}



