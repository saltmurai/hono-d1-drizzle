import { JWTPayload } from "hono/utils/jwt/types";
import { AuthService } from "../services/auth";

export interface Bindings {
  DB: D1Database;
}

export interface Variables {
  USER: JWTPayload | null;
}
