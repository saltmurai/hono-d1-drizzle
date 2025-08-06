import { User } from "../../db/schema";

export interface JWTPayload {
  sub: string; // user id
  email: string;
  role: "user" | "manager" | "admin";
  iat: number;
  exp: number;
}

export interface AuthResponse {
  user: Omit<User, "password">;
  accessToken: string;
  refreshToken: string;
}
