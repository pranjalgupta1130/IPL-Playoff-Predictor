import { NextFunction, Request, Response } from "express";
import { verifyAccessToken, AccessTokenPayload } from "../services/jwtService";

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.header("Authorization");
  if (!authHeader) {
    res.status(401).json({ message: "Missing Authorization header" });
    return;
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    res.status(401).json({ message: "Invalid Authorization header" });
    return;
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

