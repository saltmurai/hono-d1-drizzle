import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const usersTable = sqliteTable("users", {
  id: int("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["user", "manager", "admin"] })
    .notNull()
    .default("user"),
  firstName: text("first_name").default(""),
  lastName: text("last_name").default(""),
  isActive: int("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: int("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: int("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const refreshTokens = sqliteTable("refresh_tokens", {
  id: int("id").primaryKey({ autoIncrement: true }),
  token: text("token").notNull().unique(),
  userId: int("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  expiresAt: int("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: int("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable, {
  email: z.email(),
  password: z.string().min(8),
  role: z.enum(["user", "manager", "admin"]).optional(),
});

export const selectUserSchema = createSelectSchema(usersTable);

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type LoginRequest = z.infer<typeof loginSchema>;
