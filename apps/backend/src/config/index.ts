import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      open_router_api_key: string;
      google_api_key: string;

      POSTGRES_USER: string;
      POSTGRES_PASSWORD: string;
      POSTGRES_PORT: string;
      POSTGRES_DB: string;
      POSTGRES_HOST: string;
    }
  }
}

export default {
  ai: {
    open_router_api_key: process.env.open_router_api_key,
    google_api_key: process.env.google_api_key,
  },
  db: {
    POSTGRES_USER: process.env.POSTGRES_USER,
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
    POSTGRES_PORT: process.env.POSTGRES_PORT,
    POSTGRES_DB: process.env.POSTGRES_DB,
    POSTGRES_HOST: process.env.POSTGRES_HOST,
  },
};
