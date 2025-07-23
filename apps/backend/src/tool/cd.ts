import { tool, type Tool } from "ai";
import z from "zod";
import { app } from "../index.js";
import { sessionContext } from "../session/sessionContext.js";

export const cd: Tool = tool({
  description: "Change the current working directory",
  inputSchema: z.object({
    path: z
      .string()
      .describe(
        "The path of the directory to change to, must be relative to the workspace root"
      ),
  }),
  execute: async ({ path }) => {
    const docker = await app.getDocker();
    const workspaceInfo = sessionContext.getContext();
    if (!workspaceInfo) {
      throw new Error("Workspace info not found");
    }
    const result = await docker.executeCommand(
      workspaceInfo.workspaceInfo.containerId,
      ["cd", path]
    );
    if (!result.ok) {
      throw new Error(`Failed to change directory: ${result.error}`);
    }
    workspaceInfo.workspaceInfo.cwd = path;
    return {
      success: true,
    };
  },
});
