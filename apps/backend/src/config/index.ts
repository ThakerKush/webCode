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

      S3_ENDPOINT: string;
      S3_REGION: string;
      S3_ACCESS_KEY: string;
      S3_SECRET_KEY: string;
      S3_BUCKET_NAME: string;
      S3_FORCE_PATH_STYLE: string;
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
  s3: {
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
    bucketName: process.env.S3_BUCKET_NAME,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  },
};
