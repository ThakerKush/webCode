import { tool, type Tool } from "ai";
import z from "zod";
import { sessionContext } from "../session/sessionContext.js";
import { app } from "../index.js";
import { logger } from "../utils/log.js";

export const write: Tool = tool({
  description: "Write to a file",
  inputSchema: z.object({
    path: z
      .string()
      .describe("Absloute path of the file to write to, must be absolte"),
    content: z.string().describe("Content to write to the file"),
  }),
  execute: async ({ path, content }) => {
    logger.info({ child: "write tool" }, `Agent is writing to file ${path}`);
    const docker = await app.getDocker();
    const workspace = sessionContext.getContext();
    if (!workspace) {
      throw Error("Workspace Info not configured");
    }
    const result = await docker.executeCommand(
      workspace.workspaceInfo.containerId,
      ["bash", "-c", `cat > ${path} << 'EOF'\n${content}\nEOF`]
    );
    if (result.ok) {
      logger.info(
        { child: "write tool" },
        `File ${path} written successfully with ${content}`
      );
      return "File written successfully";
    } else {
      logger.error(
        { child: "write tool" },
        `Error writing to file ${path}`,
        result.error
      );
      throw Error(result.error.message);
    }
  },
});
