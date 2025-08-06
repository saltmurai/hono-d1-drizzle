import { Hono } from "hono";
import { Bindings } from "./config/cloudflare";
import userRoute from "./routes/users";
import authRoute from "./routes/auth";

import { openAPISpecs } from "hono-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { logger } from "hono/logger";
import { AuthService } from "./services/auth";
import { HTTPException } from "hono/http-exception";

console.log(process.env.JWT_ACCESS_SECRET);

const app = new Hono<{
  Bindings: Bindings;
}>().basePath("/api");

app.route("/users", userRoute);
app.route("/auth", authRoute);

app.use("*", logger()); // Use logger middleware for all routes

/* OPENAPI CONFIG */
app.get(
  "/openapi",
  openAPISpecs(app, {
    documentation: {
      info: {
        title: "STUDY LOUNGE NINE API",
        version: "1.0.0",
        description: "Greeting API",
      },
      servers: [{ url: "http://localhost:8787", description: "Local Server" }],
    },
  })
);

app.get("/scalar", Scalar({ url: "/api/openapi", theme: "none" }));

/* ERROR HANDLER */
app.onError((err, c) => {
  console.error("Error occurred:", err);
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  return c.json({ error: "Internal Server Error" }, 500);
});

export default app;
