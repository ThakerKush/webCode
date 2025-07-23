import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import config from "@/config";
import postgres, { Sql } from "postgres";
import { ChatSDKError } from "../errors";
import { eq } from "drizzle-orm";
import { chat, message } from "./schema";

let db: PostgresJsDatabase<typeof schema>;

let dbConnection: Sql = postgres({
  user: config.db.POSTGRES_USER,
  password: config.db.POSTGRES_PASSWORD,
  host: config.db.POSTGRES_HOST,
  port: Number(config.db.POSTGRES_PORT),
  database: config.db.POSTGRES_DB,
});

db = drizzle(dbConnection, { schema });

export const getChatById = async (chatId: string) => {
  try {
    const selectedChat = await db
      .select()
      .from(chat)
      .where(eq(chat.id, chatId));

    return selectedChat;
  } catch (e) {
    throw new ChatSDKError("bad_request:database", "Falied to get chat by id");
  }
};

export const getMessagesByChatId = async (chatId: string) => {
  try {
    const selectedMessages = await db
      .select()
      .from(message)
      .where(eq(message.id, chatId));

    return selectedMessages;
  } catch (e) {
    throw new ChatSDKError(
      "bad_request:database",
      "Falied to get messages by chat id"
    );
  }
};

export default db;
