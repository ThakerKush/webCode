import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import db from "./db/queries";
import config from "@/config";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  advanced: {
    database: { generateId: false },
  },
  socialProviders: {
    google: {
      clientId: config.auth.GOOGLE_CLIENT_ID,
      clientSecret: config.auth.GOOGLE_CLIENT_SECRET,
    },
  },
});
