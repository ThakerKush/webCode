import config from "../config/index.js";
import { BaseError } from "../errors/baseError.js";
import { logger } from "../utils/log.js";
import postgres, { type Sql } from "postgres";
import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq, lt } from "drizzle-orm";
import * as schema from "@repo/db/schema";
import { Err, Ok, type Result } from "../errors/result.js";

export class DbError extends BaseError {
  operation: string;
  details?: Record<string, unknown>;

  constructor(
    operation: string,
    message: string,
    details?: Record<string, unknown>,
    source = "db-service"
  ) {
    super("DB_ERROR", message, source);
    this.operation = operation;
    this.details = details;
  }

  public static connectionFailed(message: string): DbError {
    return new DbError("connection", message, {}, "db-service");
  }

  public static queryFailed(query: string, error: unknown): DbError {
    return new DbError(
      "query",
      `Query failed: ${query}`,
      { error },
      "db-service"
    );
  }

  public static notFound(resource: string, identifier: string): DbError {
    return new DbError("not_found", `${resource} not found`, { identifier });
  }

  public static validationError(message: string): DbError {
    return new DbError("validation", message);
  }
}
// let dbConnection: Sql = postgres({
//     user: config.db.POSTGRES_USER,
//     password: config.db.POSTGRES_PASSWORD,
//     host: config.db.POSTGRES_HOST,
//     port: Number(config.db.POSTGRES_PORT),
//     database: config.db.POSTGRES_DB,
//   });

//   db = drizzle(dbConnection, { schema });
const log = logger.child({ service: "db" });
export let dbConnection: Sql;
export let db: PostgresJsDatabase<typeof schema>;

export const setupDb = async () => {
  dbConnection = postgres({
    user: config.db.POSTGRES_USER,
    password: config.db.POSTGRES_PASSWORD,
    host: config.db.POSTGRES_HOST,
    port: Number(config.db.POSTGRES_PORT),
    database: config.db.POSTGRES_DB,
  });

  db = drizzle(dbConnection, { schema });
};

export const dbService = {
  ping: async (): Promise<boolean> => {
    try {
      await db.execute("SELECT 1");
      return true;
    } catch (error) {
      log.error(error, "Failed to ping databse");
      return false;
    }
  },

  getMessages: async (
    userId: number,
    chatId: number
  ): Promise<Result<schema.Message[], DbError>> => {
    try {
      const chatResults = await db
        .select()
        .from(schema.chat)
        .where(eq(schema.chat.userId, userId));
      if (chatResults.length === 0) {
        return Err(
          DbError.notFound("chat", `userId: ${userId}, chatId: ${chatId}`)
        );
      }
      const messages = await db
        .select()
        .from(schema.message)
        .where(eq(schema.message.chatId, chatId))
        .orderBy(schema.message.createdAt);
      return Ok(messages);
    } catch (error) {
      log.error(error, "Failed to get messages");
      return Err(DbError.queryFailed("getMessages", error));
    }
  },

  createChat: async (chat: schema.Chat): Promise<Result<boolean, DbError>> => {
    try {
      await db.insert(schema.chat).values(chat).returning();
      return Ok(true);
    } catch (error) {
      log.error(error, "Failed to create chat");
      return Err(DbError.queryFailed("createChat", error));
    }
  },
  createMessage: async (
    chatId: number,
    message: schema.Message
  ): Promise<Result<boolean, DbError>> => {
    try {
      const chatResult = await db
        .select()
        .from(schema.chat)
        .where(eq(schema.chat.id, chatId));
      if (chatResult.length === 0) {
        return Err(DbError.notFound("chat", `chatId: ${chatId}`));
      }
      await db.insert(schema.message).values(message).returning();
      return Ok(true);
    } catch (error) {
      log.error(error, "Failed to create message");
      return Err(DbError.queryFailed("createMessage", error));
    }
  },
  createProject: async (
    projectId: string,
    userId: number
  ): Promise<Result<boolean, DbError>> => {
    // TODO: s3 management
    try {
      await db.insert(schema.project).values({
        userId: userId,
        uuid: projectId,
        storageLink: "dummyForNow",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return Ok(true);
    } catch (error) {
      log.error(error, "Failed to create project");
      return Err(DbError.queryFailed("createProject", error));
    }
  },
  updateWorkspaceActivity: async (
    projectId: string,
    activity: "active" | "inactive" | "archiving"
  ): Promise<Result<boolean, DbError>> => {
    try {
      const result = await db
        .select()
        .from(schema.project)
        .where(and(eq(schema.project.uuid, projectId)));
      if (result.length === 0) {
        return Err(DbError.notFound("project", `projectId: ${projectId}`));
      }
      const project = result[0];
      await db
        .update(schema.project)
        .set({
          lastHeartbeat: new Date(),
          workspaceStatus: activity,
        })
        .where(eq(schema.project.id, project.id));
      return Ok(true);
    } catch (error) {
      log.error(error, "Failed to update workspace activity");
      return Err(DbError.queryFailed("updateWorkspaceActivity", error));
    }
  },
  updateHeartbeat: async (
    projectId: string
  ): Promise<Result<void, DbError>> => {
    try {
      const result = await db
        .update(schema.project)
        .set({ lastHeartbeat: new Date() })
        .where(eq(schema.project.uuid, projectId));
      if (result.length === 0) {
        return Err(DbError.notFound("project", `projectId: ${projectId}`));
      }
      return Ok(undefined);
    } catch (error) {
      log.error(error, "Failed to update heartbeat");
      return Err(DbError.queryFailed("updateHeartbeat", error));
    }
  },
  getStaleWorkspaces: async (
    heartbeatTimeout: number
  ): Promise<Result<schema.Project[], DbError>> => {
    try {
      const cutoff = new Date(Date.now() - heartbeatTimeout);
      const result = await db
        .select()
        .from(schema.project)
        .where(
          and(
            eq(schema.project.workspaceStatus, "active"),
            lt(schema.project.lastHeartbeat, cutoff)
          )
        );
      return Ok(result);
    } catch (error) {
      log.error(error, "Failed to get stale workspaces");
      return Err(DbError.queryFailed("getStaleWorkspaces", error));
    }
  },
  markWorkspaceActivity: async (
    projectId: string,
    activity: schema.Project["workspaceStatus"]
  ) => {
    try {
      const result = await db
        .update(schema.project)
        .set({ workspaceStatus: activity })
        .where(eq(schema.project.uuid, projectId));
      if (result.length === 0) {
        return Err(DbError.notFound("project", `projectId: ${projectId}`));
      }
      return Ok(true);
    } catch (error) {
      log.error(error, "Failed to mark workspace activity");
      return Err(DbError.queryFailed("markWorkspaceActivity", error));
    }
  },
  updateStorageLink: async (
    projectId: string,
    storageLink: string
  ): Promise<Result<boolean, DbError>> => {
    try {
      const result = await db
        .update(schema.project)
        .set({ storageLink: storageLink })
        .where(eq(schema.project.uuid, projectId))
        .returning({ uuid: schema.project.uuid });
      if (result.length === 0) {
        return Err(DbError.notFound("project", `projectId: ${projectId}`));
      }
      return Ok(true);
    } catch (error) {
      log.error(error, "Failed to update storage link");
      return Err(DbError.queryFailed("updateStorageLink", error));
    }
  },
};
