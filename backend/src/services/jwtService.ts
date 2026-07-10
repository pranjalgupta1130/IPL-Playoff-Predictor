import jwt from "jsonwebtoken";

const ACCESS_TOKEN_TTL_SECONDS = Number(
  process.env.JWT_ACCESS_TOKEN_TTL_SECONDS || 60 * 60 * 24 // 24 hours
);

export interface AccessTokenPayload {
  sub: string;
  email: string;
  name: string;
  favouriteTeam?: string;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.trim() === "") {
    throw new Error("JWT_SECRET is not configured");
  }

  return secret;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, getJwtSecret());

  if (typeof decoded === "string") {
    throw new Error("Invalid access token");
  }

  const d = decoded as Partial<AccessTokenPayload>;

  if (!d.sub || !d.email || !d.name) {
    throw new Error("Invalid access token payload");
  }

  return {
    sub: d.sub,
    email: d.email,
    name: d.name,
    favouriteTeam: d.favouriteTeam,
  };
}