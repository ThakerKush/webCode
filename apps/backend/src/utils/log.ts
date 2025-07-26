// apps/backend/src/utils/logger.ts
import { pino } from "pino";

// export const logger = pino({
//   level: process.env.LOG_LEVEL || "info",
//   transport:
//     process.env.NODE_ENV === "development"
//       ? {
//           target: "pino-pretty",
//           options: { colorize: true },
//         }
//       : undefined,
// });

export const logger = pino({
  level: "debug",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "HH:MM:ss Z",
      ignore: "pid,hostname",

    },
  },
});
