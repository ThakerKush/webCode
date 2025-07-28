import { logger } from "../utils/log.js";
import { dockerService } from "./docker.js";
import { s3Service } from "./s3.js";
import { dbService } from "./db.js";
import { BaseError } from "../errors/baseError.js";
import { Err, Ok, type Result } from "../errors/result.js";

export class WorkspaceManagerError extends BaseError {
  operation: string;
  details?: Record<string, unknown>;
  constructor(
    operation: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super("WORKSPACE_MANAGER_ERROR", message, "workspace-manager");
    this.operation = operation;
    this.details = details;
  }
}

const log = logger.child({ service: "workspace-manager" });
const db = dbService;
const docker = dockerService;
const s3 = s3Service;
const heartbeatTimeout = 10 * 60 * 1000; // 10 minutes
let cleanupInterval: NodeJS.Timeout;
export const setupWorkspaceManager = async () => {
  log.info("Setting up workspace manager");
  workspaceManager.startCleanupJob();
  log.info("Workspace manager setup complete");
};

export const workspaceManager = {
  updateHeartbeat: async (
    projectId: string
  ): Promise<Result<void, WorkspaceManagerError>> => {
    const result = await db.updateHeartbeat(projectId);

    if (!result.ok) {
      return Err(
        new WorkspaceManagerError(
          "heartbeat_update",
          `Failed to update heartbeat: ${result.error.message}`
        )
      );
    }

    return Ok(undefined);
  },

  startCleanupJob: async (): Promise<void> => {
    cleanupInterval = setInterval(() => {
      workspaceManager.performCleanup().catch((error) => {
        log.error("Cleanup job failed:", error);
      });
    }, 30 * 1000);
  },

  performCleanup: async (): Promise<void> => {
    const staleWorkspaces = await db.getStaleWorkspaces(heartbeatTimeout);

    if (!staleWorkspaces.ok) {
      log.error(staleWorkspaces.error, "Failed to get stale workspaces:");
      return;
    }

    for (const workspace of staleWorkspaces.value) {
      log.info({ workspace }, "Archiving workspace:");
      await workspaceManager.archiveWorkspace(workspace.uuid);
    }
  },

  archiveWorkspace: async (projectId: string): Promise<void> => {
    try {
      log.info(`Archiving workspace ${projectId}`);
      await db.markWorkspaceActivity(projectId, "archiving");

      // Export → S3 → cleanup logic stays the same
      const exportResult = await docker.exportContainer(projectId);
      if (!exportResult.ok)
        throw new Error(`Export failed: ${exportResult.error.message}`);

      const s3Key = `workspaces/${projectId}/${Date.now()}.tar.gz`;
      const dbResult = await dbService.updateStorageLink(projectId, s3Key);
      if (!dbResult.ok) {
        log.error(
          dbResult.error,
          `Failed to update storage link: ${dbResult.error.message}`
        );
        throw new Error(
          `Failed to update storage link: ${dbResult.error.message}`
        );
      }
      log.info(`Updated storage link for ${projectId}`);

      const uploadResult = await s3.uploadFile(
        s3Key,
        exportResult.value.stream,
        "application/gzip"
      );
      if (!uploadResult.ok) {
        log.error(
          uploadResult.error,
          `Upload failed: ${uploadResult.error.message}`
        );
        throw new Error(`Upload failed: ${uploadResult.error.message}`);
      }
      log.info(`Uploaded workspace ${projectId} to S3`);
      await docker.stopAndRemoveContainer(projectId, exportResult.value.image);
      await db.updateWorkspaceActivity(projectId, "inactive");
      log.info(`Archived workspace ${projectId}`);
      return;
    } catch (error) {
      log.error(error, `Archive failed for ${projectId}:`);
      await db.updateWorkspaceActivity(projectId, "active");
      // throw error; not sure if I have to throw the error here, this is a background service so does it have to right to throw errors?
    }
  },
  stopCleanupJob: async () => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
    }
  },
};
