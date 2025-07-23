import { serve } from "@hono/node-server";
import { zValidator } from "@hono/zod-validator";
import z from "zod";
import { Hono } from "hono";
import { App } from "./app/index.js";
import { DockerService } from "./services/docker.js";
import {
  sessionContext,
  type SessionContext,
} from "./session/sessionContext.js";
import {
  convertToModelMessages,
  generateText,
  stepCountIs,
  streamText,
} from "ai";
import { registery } from "./app/registry.js";
import { ls } from "./tool/ls.js";
import { cd } from "./tool/cd.js";
import { edit } from "./tool/edit.js";
import { read } from "./tool/read.js";
import { write } from "./tool/write.js";
import { todoRead, todoWrite } from "./tool/todo.js";
import { terminal } from "./tool/terminal.js";
import { DbService } from "./services/db.js";
import { convertModelMessage } from "./utils/convertModelMessage.js";
import { v4 as uuidv4 } from "uuid";
import { Readable } from "stream";
import { stream } from "hono/streaming";
import { fin } from "./tool/serve.js";
import { logger } from "./utils/log.js";
const server = new Hono();

// TODO: make this into a server service
// only export app after it is initialized
const app = new App();
await app.initialize();
app.service("docker", (): DockerService => new DockerService());
app.service("db", (): DbService => new DbService());
export { app };

const imageName = "code-workspace:latest";
//this should also have a try catch
server
  // .post(
  //   "/workspace/create",
  //   zValidator(
  //     "json",
  //     z.object({
  //       userId: z.string(),
  //       projectId: z.string(),
  //     })
  //   ),
  //   async (c) => {
  //     // First build the image
  //     const { projectId, userId } = c.req.valid("json");
  //     const docker = await app.getDocker();
  //     //check if it already exists??
  //     const result = await docker.buildImage("../", imageName);

  //     if (result.ok) {
  //       console.log("yay build complete");
  //     } else {
  //       console.error(result.error);
  //       return c.json({ Message: "Build Failed", error: result.error }, 500);
  //     }
  //     //Then sipin up the contaienr
  //     const containerResult = await docker.makeContaier(
  //       imageName,
  //       projectId
  //     );
  //     if (containerResult.ok) {
  //       return c.json(
  //         { Message: "Container Created", container: containerResult.value },
  //         200
  //       );
  //     } else {
  //       console.error(containerResult.error);
  //       return c.json(
  //         {
  //           Message: "Container Creation Failed",
  //           error: containerResult.error,
  //         },
  //         500
  //       );
  //     }
  //   }
  // )
  .post(
    "/agent/run",
    zValidator(
      "json",
      z.object({
        userId: z.number(),
        chatId: z.number(),
        projectId: z.string().optional(),
        prompt: z.string(),
      })
    ),
    async (c) => {
      try {
        const db = await app.getDb();
        const { userId, chatId, prompt } = c.req.valid("json");
        let projectId = c.req.valid("json").projectId;
        const imageName = "code-workspace:latestV2";
        const docker = await app.getDocker();
        if (!projectId) {
          projectId = uuidv4();
          const projectResult = await db.createProject(
            projectId,
            userId,
            chatId
          );
          if (!projectResult.ok) {
            console.error("Project creation error");
            return c.json(
              {
                Message: "Project Creation failed",
                error: projectResult.error,
              },
              500
            );
          }
        }
        const container = await docker.getOrCreateWorkspace(
          projectId,
          userId,
          imageName
        ); // very hacky solution for now, just ship
        if (!container.ok) {
          console.error("Can't get container", container.error);
          return c.json({
            Message: "Failed to fetch container for workspace",
            error: container.error.message,
          });
        }

        const context: SessionContext = {
          projectId: projectId,
          workspaceInfo: container.value,
        };
        // get the messages from the db, consider adding message to context as of now there is no need
        const messageResult = await db.getMessages(userId, chatId);
        if (!messageResult.ok) {
          console.error("Failed to get messages", messageResult.error);
          return c.json({
            Message: "Failed to get messages",
            error: messageResult.error,
          });
        }
        const message = convertModelMessage(messageResult.value);
        //; Run the agent with the session context
        let runComman;
        const result = await sessionContext.run(context, async () => {
          const result = await generateText({
            model: registery.languageModel("openRouter:qwen/qwen3-coder"),

            system:
              "You are a coding agent, use the tools given to you to complete user tasks, for more complex tasks use a todo list to track your progress",
            tools: {
              // ls,
              // cd,
              read,
              write,
              edit,
              // todoWrite,
              // todoRead,
              terminal,
              fin,
              // Remaining tools: git
            },
            // toolChoice: "required",
            stopWhen: stepCountIs(100),
            prompt: prompt,
            //when the stream is done run the serve command in the container
          });
          //run the serve command in the container)
          logger.info(context.runCommand, context.buildCommand);

          return result;
        });
        return c.json({
          Message: "Agent run successful",
          result: result,
        });
        // after this build and run the project --> on failure
      } catch (error) {
        console.error("unexpectedError", error);
        return c.json({
          Message: "Agent failed to run",
          error: error,
        });
      }
    }
  );

serve(
  {
    fetch: server.fetch,
    port: 3001,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
