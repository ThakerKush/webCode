import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { DbError, dbService } from "../services/db.js";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/log.js";
import { dockerService, type WorkspaceInfo } from "../services/docker.js";
import {
  convertToModelMessages,
  hasToolCall,
  stepCountIs,
  streamText,
  type UserModelMessage,
} from "ai";
import { registery } from "./registry.js";
import { terminal } from "../tool/terminal.js";
import {
  sessionContext,
  type SessionContext,
} from "../session/sessionContext.js";
import { read } from "../tool/read.js";
import { write } from "../tool/write.js";
import { edit } from "../tool/edit.js";
import { fin } from "../tool/serve.js";
import { describe } from "../tool/describte.js";
import { stream } from "hono/streaming";
import {
  getSessionContext,
  setSessionContext,
  workspaceManager,
} from "../services/workspaceManager.js";
import { convertModelMessage } from "../utils/convertModelMessage.js";

const app = new Hono();
const log = logger.child({ service: "backend" });
const imageName = "code-workspace:latestV2";
// Eventuallly this will have a model selector
app
  .post(
    "/chat",
    zValidator(
      "json",
      z.object({
        userId: z.number(),
        prompt: z.string(),
      })
    ),
    async (c) => {
      const { userId, prompt } = c.req.valid("json");
      const projectId = uuidv4();
      const container = await dockerService.createBaseWorkspace(
        projectId,
        imageName
      );

      if (!container.ok) {
        log.info(
          { route: "/chat", error: container.error },
          "Error when creating container"
        );
        return c.json({ error: container.error }, 500);
      }

      const project = await dbService.insertProject(
        projectId,
        userId,
        "active"
      );
      if (!project.ok) {
        log.info(
          { route: "/chat", error: project.error },
          "Error when creating project"
        );
        // archive project?? or no??
        return c.json({ error: project.error }, 500);
      }

      // Run the agent inside the session context
      const context: SessionContext = {
        projectId,
        workspaceInfo: container.value,
      };
      setSessionContext(projectId, context);
      const chatId = await dbService.insertChat({
        userId,
        projectId: project.value,
        title: null,
        visibility: "private",
        uuid: uuidv4(),
        createdAt: new Date(),
      });

      if (!chatId.ok) {
        log.info(
          { route: "/chat", error: chatId.error },
          "Error when creating chat"
        );
        return c.json({ error: chatId.error }, 500);
      }
      // TODO: add error handling and cleanup
      const aiStream = await sessionContext.run(context, async () => {
        const result = streamText({
          model: registery.languageModel("openRouter:google/gemini-2.5-flash"),
          system: `You are a helpful coding agent with access to a Docker workspace. You can execute terminal commands, read/write files, and edit code. Your goal is to help users build applications, primarily using Vite and modern web technologies. Wrok step by step and use tools as needed to acomplish the users needs.`,
          tools: {
            terminal,
            read,
            write,
            edit,
            describe,
            fin,
          },
          stopWhen: stepCountIs(50),
          prompt,
        });
        return result.toUIMessageStreamResponse({
          onFinish: async ({ messages, responseMessage }) => {
            const userMessage = {
              chatId: chatId.value,
              messageUuid: uuidv4(),
              role: "user",
              parts: [{ type: "text", text: prompt }],
              attachments: [],
              createdAt: new Date(),
            };
            await dbService.insertMessage(chatId.value, userMessage);

            const messageToSave = {
              chatId: chatId.value,
              messageUuid: uuidv4(),
              role: responseMessage.role,
              parts: responseMessage.parts,
              attachments: [], // do attachments need to be different from parts?
              createdAt: new Date(),
            };
            await dbService.insertMessage(chatId.value, messageToSave);
          },
        });
      });
      return aiStream;
    }
  )
  .post(
    "/chat/:chatId",
    zValidator("param", z.object({ chatId: z.string() })),
    //TODO: add attachment supoprt here
    zValidator("json", z.object({ userId: z.number(), prompt: z.string() })),
    async (c) => {
      try {
        const { chatId } = c.req.valid("param");
        const { userId, prompt } = c.req.valid("json");

        const messageResult = await dbService.getChatInfo(userId, chatId);
        if (!messageResult.ok) {
          log.error(
            { route: "/chat/:id", error: messageResult.error },
            "Error when getting chat info"
          );
          return c.json({ error: messageResult.error }, 500);
        }
        const messages = convertModelMessage(messageResult.value.messages);
        let context: SessionContext | null = getSessionContext(
          messageResult.value.project?.uuid!
        );
        if (!context) {
          log.info(`Workspace not in memory, querying docker api`);
          let workspaceResult = await dockerService.getWorkspace(
            messageResult.value.project?.uuid!
          );
          if (!workspaceResult.ok) {
            log.info(`Workspace not found in docker, restoring from s3`);
            await workspaceManager.restoreWorkspace(
              messageResult.value.project?.uuid!
            );
            workspaceResult = await dockerService.getWorkspace(
              messageResult.value.project?.uuid!
            );
          }
          if (!workspaceResult.ok) {
            log.error(workspaceResult.error, "Error when getting workspace");
            return c.json({ error: workspaceResult.error }, 500);
          }
          context = {
            projectId: messageResult.value.project?.uuid!,
            workspaceInfo: workspaceResult.value,
          };
        }
        const aiStream = await sessionContext.run(context, async () => {
          const result = streamText({
            model: registery.languageModel(
              "openRouter:google/gemini-2.5-flash"
            ),
            system: `You are a helpful coding agent with access to a Docker workspace. You can execute terminal commands, read/write files, and edit code. Your goal is to help users build applications, primarily using Vite and modern web technologies. Wrok step by step and use tools as needed to acomplish the users needs.`,
            tools: {
              terminal,
              read,
              write,
              edit,
              describe,
              fin,
            },
            messages: [
              ...messages,
              { role: "user", content: prompt } as UserModelMessage,
            ],
            stopWhen: stepCountIs(50),
          });
          return result.toUIMessageStreamResponse({
            onFinish: async ({ messages, responseMessage }) => {
              const userMessage = {
                chatId: messageResult.value.chat.id,
                role: "user",
                messageUuid: uuidv4(),
                parts: [{ type: "text", text: prompt }],
                attachments: [],
                createdAt: new Date(),
              };
              await dbService.insertMessage(
                messageResult.value.chat.id,
                userMessage
              );

              const messageToSave = {
                chatId: messageResult.value.chat.id,
                messageUuid: uuidv4(),
                role: responseMessage.role,
                parts: responseMessage.parts,
                attachments: [], // do attachments need to be different from parts?
                createdAt: new Date(),
              };
              await dbService.insertMessage(
                messageResult.value.chat.id,
                messageToSave
              );
            },
          });
        });
        return aiStream;
      } catch (error) {
        log.error(error, "Error when running session context");
        return c.json({ error: "Internal server error" }, 500);
      }
    }
  );

export default app;
