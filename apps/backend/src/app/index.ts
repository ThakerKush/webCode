import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { executeWorkspaceLifecycle } from "../routes/chat.js";

const app = new Hono();

app.get("/", async (c) => {
  const result = await executeWorkspaceLifecycle();

  return c.json({ sucess: "True" });
});

export default app;
