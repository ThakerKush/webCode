import { tool } from "ai";
import { z } from "zod";
import { sessionContext } from "../session/sessionContext.js";

export const describe = tool({
  description: "Use this tool to describe the project to the user",
  inputSchema: z.object({
    description: z.string().describe("A short description of the project"),
  }),
  execute: async ({ description }) => {
    const context = sessionContext.getContext();
    if (!context) {
      // TODO: Figure out error handling inside tool calls
      throw new Error("No context found");
    }
    context.projectDescription = description;
    return {
      message: `Project described as ${description}`,
    };
  },
});
