import config from "@/config";
import postgres, { type Sql } from "postgres";
import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@repo/db/schema";

const dbConnection: Sql = postgres({
  user: config.db.POSTGRES_USER,
  password: config.db.POSTGRES_PASSWORD,
  host: config.db.POSTGRES_HOST,
  port: Number(config.db.POSTGRES_PORT),
  database: config.db.POSTGRES_DB,
});

export const db = drizzle(dbConnection, { schema });
