import { tool, type Tool } from "ai";
import z from "zod";
import { sessionContext } from "../session/sessionContext.js";
import { logger } from "../utils/log.js";

const todoSchema = z.object({
  description: z.string().describe("Breif description of the current task"),
  status: z
    .enum(["pending", "in_progress", "completed"])
    .describe("The status of the current task"),
  priority: z
    .enum(["low", "medium", "high"])
    .describe("The priority of the current task"),
});

export const todoWrite: Tool = tool({
  description: "You can use this tool to only write to the todo list.",
  inputSchema: z.object({
    todo: z
      .array(todoSchema)
      .describe("The todo list to read from or write to"),
  }),
  execute: async ({ todo }) => {
    logger.info(
      { child: "todo write tool" },
      `Agent is writing todo list with ${todo.length} items`
    );
    // add the todo list to session context
    const context = sessionContext.getContext();
    if (!context) {
      throw new Error("No context found");
    }
    context.workspaceInfo.todo = todo;
    return {
      message: `Todo list updated with ${todo.length} items`,
    };
  },
});

export const todoRead: Tool = tool({
  description: "You can use this tool to read the todo list.",
  inputSchema: z.object({}),
  execute: async () => {
    logger.info({ child: "todo read tool" }, `Agent is reading todo list`);
    const context = sessionContext.getContext();
    if (!context) {
      throw new Error("No context found");
    }
    const todo = context.workspaceInfo.todo;
    if (!todo) {
      logger.error(
        { child: "todo read tool" },
        `No todo list found in context`
      );
      throw new Error("No todo list found");
    }
    return {
      message: JSON.stringify(todo),
    };
  },
});
