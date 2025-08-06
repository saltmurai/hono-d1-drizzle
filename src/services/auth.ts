import { sign, verify } from "hono/jwt";
import { User } from "../db/schema";
import { JWTPayload } from "hono/utils/jwt/types";

export class AuthService {
  private accessTokenSecret: string;
  private refreshTokenSecret: string;

  constructor(accessSecret: string, refreshSecret: string) {
    this.accessTokenSecret = accessSecret;
    this.refreshTokenSecret = refreshSecret;
  }

  async generateAccessToken(user: User): Promise<string> {
    const payload: JWTPayload = {
      sub: user.id.toString(),
      id: user.id,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
    };

    return await sign(payload, this.accessTokenSecret);
  }

  async generateRefreshToken(userId: number): Promise<string> {
    const payload = {
      sub: userId.toString(),
      type: "refresh",
      iat: Math.floor(Date.now() / 1000), // issued at
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
    };

    return await sign(payload, this.refreshTokenSecret);
  }

  async verifyAccessToken(token: string): Promise<JWTPayload | null> {
    try {
      const payload = (await verify(
        token,
        this.accessTokenSecret
      )) as JWTPayload;
      return payload;
    } catch {
      return null;
    }
  }

  async verifyRefreshToken(token: string): Promise<any> {
    try {
      return await verify(token, this.refreshTokenSecret);
    } catch {
      return null;
    }
  }

  async hashPassword(password: string): Promise<string> {
    // Uses Web Crypto API, compatible with Worker environments like Cloudflare Workers
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async verifyPassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    const hashedInput = await this.hashPassword(password);
    return hashedInput === hashedPassword;
  }
}

export const authService = new AuthService(
  process.env.JWT_ACCESS_SECRET!,
  process.env.JWT_REFRESH_SECRET!
);
