import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { authService } from "../services/auth";

export const authMiddleware = (
  requiredRoles?: ("user" | "manager" | "admin")[]
) =>
  createMiddleware(async (c, next) => {
    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new HTTPException(401, { message: "No token provided" });
    }

    const token = authHeader.substring(7);

    const payload = await authService.verifyAccessToken(token);

    if (!payload) {
      throw new HTTPException(401, { message: "Invalid or expired token" });
    }

    if (
      requiredRoles &&
      !requiredRoles.includes(payload.role as "user" | "manager" | "admin")
    ) {
      throw new HTTPException(403, { message: "Insufficient permissions" });
    }

    c.set("USER", payload);
    await next();
  });
