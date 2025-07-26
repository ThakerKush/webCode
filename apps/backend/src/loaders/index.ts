import { setupDb } from "../services/db.js";
import { setupDocker } from "../services/docker.js";
import { setupS3 } from "../services/s3.js";
import { setupWorkspaceManager } from "../services/workspaceManager.js";
import sleep from "../utils/sleep.js";

export default async function loaders() {
  let retries = 1;
  while (retries <= 5) {
    try {
      await setupDb();
      await setupDocker();
      await setupS3();
      await setupWorkspaceManager();

      break;
    } catch (error) {
      await sleep(5000);
      retries++;
      if (retries >= 5) {
        throw error;
      }
    }
  }
}
