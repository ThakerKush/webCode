import { tool, type Tool } from "ai";
import z from "zod";
import { sessionContext } from "../session/sessionContext.js";
import { app } from "../index.js";
import { handleStream } from "../utils/handleStream.js";
import { logger } from "../utils/log.js";

export const terminal: Tool = tool({
  description:
    "Use this tool to execute terminal commands only use this for interactive commands like cd, ls, etc do not use this command to start a server",
  inputSchema: z.object({
    command: z.string().describe("The command to execute"),
  }),
  execute: async ({ command }) => {
    try {
      logger.info(
        { child: "terminal tool" },
        `Agent called terminal tool with ${command} command `
      );
      const docker = await app.getDocker();
      const context = sessionContext.getContext();
      if (!context) {
        throw new Error("No context found");
      }
      const marker = "__AGENT_COMMAND_DONE__";
      const stream = context.workspaceInfo.shellSession.stream;
      const commandWithMarker = `${command}; echo ${marker}$?`;
      // Write command to stream
      stream.write(commandWithMarker + "\n");

      // Handle the stream response
      const result = await handleStream(stream, {
        isTTY: false,
        collect: true,
        doneMarker: marker,
      });
      logger.info(
        {
          child: "terminal tool",
          result: {
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
          },
        },
        `Terminal tool executed. Result:\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}\nExit Code: ${result.exitCode}`
      );
      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
      };
    } catch (error) {
      logger.error(
        { child: "terminal tool" },
        `Terminal tool failed with ${error} error`
      );
      throw new Error("Unknown Error in terminal tool");
    }
  },
});
