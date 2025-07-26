import app from "../app/index.js";
import { dbConnection } from "../services/db.js";
import { dockerService } from "../services/docker.js";
import { s3Service } from "../services/s3.js";
import { workspaceManager } from "../services/workspaceManager.js";

export default async function teardown() {
  await dbConnection.end();
  await workspaceManager.stopCleanupJob();
  s3Service.end();
  return;
}
