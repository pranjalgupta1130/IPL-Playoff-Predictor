import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { AuthRequest } from "../utils/authMiddleware";

const JWT_SECRET = process.env.JWT_SECRET || "ipl-secret-key-super-secure";

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, favoriteTeam } = req.body;
    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: "User already exists" });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({
      email,
      passwordHash,
      lastLogin: new Date(),
      favoriteTeam,
    });

    await newUser.save();

    const token = jwt.sign({ userId: newUser._id, email: newUser.email }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        email: newUser.email,
        lastLogin: newUser.lastLogin,
        totalSimulationsCount: newUser.totalSimulationsCount,
        savedSimulationsCount: newUser.savedSimulationsCount,
        favoriteTeam: newUser.favoriteTeam,
      },
    });
  } catch (error: any) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error during registration", error: error?.message });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        lastLogin: user.lastLogin,
        totalSimulationsCount: user.totalSimulationsCount,
        savedSimulationsCount: user.savedSimulationsCount,
        favoriteTeam: user.favoriteTeam,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login", error: error?.message });
  }
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json({
      id: user._id,
      email: user.email,
      lastLogin: user.lastLogin,
      totalSimulationsCount: user.totalSimulationsCount,
      savedSimulationsCount: user.savedSimulationsCount,
      favoriteTeam: user.favoriteTeam,
    });
  } catch (error: any) {
    console.error("getMe error:", error);
    res.status(500).json({ message: "Server error fetching user", error: error?.message });
  }
}

export async function updateStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { totalSimulationsCount, savedSimulationsCount } = req.body;
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (totalSimulationsCount !== undefined) {
      user.totalSimulationsCount = Number(totalSimulationsCount);
    }
    if (savedSimulationsCount !== undefined) {
      user.savedSimulationsCount = Number(savedSimulationsCount);
    }

    await user.save();

    res.json({
      id: user._id,
      email: user.email,
      lastLogin: user.lastLogin,
      totalSimulationsCount: user.totalSimulationsCount,
      savedSimulationsCount: user.savedSimulationsCount,
      favoriteTeam: user.favoriteTeam,
    });
  } catch (error: any) {
    console.error("updateStats error:", error);
    res.status(500).json({ message: "Server error updating stats", error: error?.message });
  }
}
