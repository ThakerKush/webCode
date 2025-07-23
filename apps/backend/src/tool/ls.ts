import { tool, type Tool } from "ai";
import z from "zod";
import { sessionContext } from "../session/sessionContext.js";
import { app } from "../index.js";
// every single instance of the agent wil have it's own workspaceInfo object

export const ls: Tool = tool({
  description: "List files and directories in a specified path",
  inputSchema: z.object({
    path: z
      .string()
      .optional()
      .default(".")
      .describe("Directory path to list (defaults to current directory)"),
    flags: z
      .string()
      .optional()
      .describe("Additional ls flags like -la, -lh, etc."),
  }),
  execute: async ({ path, flags }) => {
    const docker = await app.getDocker();
    try {
      const workspace = sessionContext.getContext();
      if (!workspace) {
        throw Error("Workspace Info not configured"); // Make this wayy better later on
      }
      const result = await docker.executeCommand(
        workspace.workspaceInfo.containerId,
        ["ls", flags || "", path || ""]
      );
      if (result.ok) {
        return result.value.stdout;
      } else {
        throw Error(result.error.message);
      }
    } catch (error) {
      console.error("Error in ls tool", error);
      throw new Error("Error in ls tool");
    }
  },
});
