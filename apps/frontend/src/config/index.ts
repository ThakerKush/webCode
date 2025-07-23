import * as dotenv from "dotenv";
import path from "path";
import constants from "./constants";

dotenv.config({ path: "../../.env" });
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      OPENROUTERAPIKEY: string;

      BETTER_AUTH_SECRET: string;
      BETTER_AUTH_URL: string;

      POSTGRES_USER: string;
      POSTGRES_PASSWORD:string
      POSTGRES_PORT: number;
      POSTGRES_DB: string;
      POSTGRES_HOST: string;

      GOOGLE_CLIENT_ID: string;
      GOOGLE_CLIENT_SECRET: string;

    }
  }
}
export default {
  db: {
    POSTGRES_USER: process.env.POSTGRES_USER,
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
    POSTGRES_PORT: process.env.POSTGRES_PORT,
    POSTGRES_DB: process.env.POSTGRES_DB,
    POSTGRES_HOST: process.env.POSTGRES_HOST,
  },
  auth: {
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL, 

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  },
  
  OPENROUTERAPIKEY: process.env.OPENROUTERAPIKEY,
  constants,
  redis: {
  },
} as const;
