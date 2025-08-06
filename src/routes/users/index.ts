import { Hono } from "hono";
import { Bindings, Variables } from "../../config/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { usersTable } from "../../db/schema";
import { describeRoute } from "hono-openapi";
import { authMiddleware } from "../../middlewares/auth";
import { email } from "zod";

const app = new Hono<{
  Bindings: Bindings;
  Variables: Variables;
}>();

app.get("/", authMiddleware(["user"]), async (c) => {
  const user = c.get("USER");
  if (!user) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  console.log(user.id);
  const db = drizzle(c.env.DB);
  const users = await db.select().from(usersTable).all();
  return c.json(users);
});

export default app;
