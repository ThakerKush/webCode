import "dotenv/config";

import app from "./app/index.js";
import config from "./config/index.js";
import loaders from "./loaders/index.js";
import { logger } from "./utils/log.js";
import { serve } from "@hono/node-server";
import closeWithGrace from "close-with-grace";
import teardown from "./utils/taredown.js";

const log = logger.child({
  service: "backend",
});

closeWithGrace({ delay: 10000 }, async ({ signal, err }) => {
  if (err) {
    logger.fatal(err);
  }

  logger.info(`${signal} Received - Attempting to gracefully shutdown...`);

  await teardown();

  logger.info(`All persistent connections closed. Shutting down...`);
});

async function startServer() {
  await loaders();
  const port = Number(config.port);

  serve(
    {
      fetch: app.fetch, // Make sure app.fetch exists
      port,
    },
    (info) => {
      log.info({
        msg: `${config.name} service listening on http://localhost:${info.port}`,
      });
    }
  );
}

startServer();
