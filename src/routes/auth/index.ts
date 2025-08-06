import { drizzle } from "drizzle-orm/d1";
import {
  insertUserSchema,
  usersTable,
  refreshTokens,
  loginSchema,
} from "../../db/schema";
import { Hono } from "hono";
import { Bindings } from "../../config/cloudflare";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { AuthResponse } from "./schema";
import { authMiddleware } from "../../middlewares/auth";
import { authService } from "../../services/auth";

const app = new Hono<{
  Bindings: Bindings;
}>();

app.post("/register", async (c) => {
  const db = drizzle(c.env.DB);
  try {
    const body = await c.req.json();
    console.log("Request body:", body);
    const validatedData = insertUserSchema.parse(body);

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, validatedData.email))
      .get();

    if (existingUser) {
      return c.json({ message: "User already exists" }, 409);
    }

    // Hash password and create user
    const hashedPassword = await authService.hashPassword(
      validatedData.password
    );

    const [newUser] = await db
      .insert(usersTable)
      .values({
        ...validatedData,
        password: hashedPassword,
      })
      .returning();

    // Generate tokens
    const accessToken = await authService.generateAccessToken(newUser);
    const refreshToken = await authService.generateRefreshToken(newUser.id);

    // Store refresh token
    await db.insert(refreshTokens).values({
      token: refreshToken,
      userId: newUser.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    const { password, ...userWithoutPassword } = newUser;

    const response: AuthResponse = {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };

    return c.json(response, 201);
  } catch (error) {
    console.error("Error during registration:", error);
    throw error;
  }
});

app.post("/login", async (c) => {
  const db = drizzle(c.env.DB);
  try {
    const body = await c.req.json();
    const { email, password } = loginSchema.parse(body);

    // Find user
    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .get();

    if (!user || !user.isActive) {
      throw new HTTPException(401, { message: "Invalid credentials" });
    }

    // Verify password
    const isValidPassword = await authService.verifyPassword(
      password,
      user.password
    );

    if (!isValidPassword) {
      throw new HTTPException(401, { message: "Invalid credentials" });
    }

    // Generate tokens
    const accessToken = await authService.generateAccessToken(user);
    const refreshToken = await authService.generateRefreshToken(user.id);

    // Store refresh token
    await db.insert(refreshTokens).values({
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const { password: _, ...userWithoutPassword } = user;

    const response: AuthResponse = {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };

    return c.json(response);
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(400, { message: "Invalid request data" });
  }
});

app.post("/refresh", async (c) => {
  const db = drizzle(c.env.DB);
  try {
    const { refreshToken } = await c.req.json();

    if (!refreshToken) {
      throw new HTTPException(400, { message: "Refresh token required" });
    }

    // Verify refresh token
    const payload = await authService.verifyRefreshToken(refreshToken);

    if (!payload) {
      throw new HTTPException(401, { message: "Invalid refresh token" });
    }

    // Check if refresh token exists in database
    const storedToken = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, refreshToken))
      .get();

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new HTTPException(401, {
        message: "Refresh token expired or invalid",
      });
    }

    // Get user
    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, storedToken.userId))
      .get();

    if (!user || !user.isActive) {
      throw new HTTPException(401, { message: "User not found or inactive" });
    }

    // Generate new tokens
    const newAccessToken = await authService.generateAccessToken(user);
    const newRefreshToken = await authService.generateRefreshToken(user.id);

    // Update refresh token in database
    await db
      .update(refreshTokens)
      .set({
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .where(eq(refreshTokens.id, storedToken.id));

    return c.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(400, { message: "Invalid request data" });
  }
});

app.post("/logout", authMiddleware(), async (c) => {
  const db = drizzle(c.env.DB);
  try {
    const { refreshToken } = await c.req.json();

    if (refreshToken) {
      // Remove refresh token from database
      await db
        .delete(refreshTokens)
        .where(eq(refreshTokens.token, refreshToken));
    }

    return c.json({ message: "Logged out successfully" });
  } catch (error) {
    throw new HTTPException(400, { message: "Logout failed" });
  }
});

export default app;
