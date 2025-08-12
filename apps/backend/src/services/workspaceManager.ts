import { logger } from "../utils/log.js";
import { dockerService } from "./docker.js";
import { s3Service } from "./s3.js";
import { dbService } from "./db.js";
import { BaseError } from "../errors/baseError.js";
import { Err, Ok, type Result } from "../errors/result.js";
import { createGunzip } from "zlib";
import {
  sessionContext,
  type SessionContext,
} from "../session/sessionContext.js";

export class WorkspaceManagerError extends BaseError {
  operation: string;
  details?: any;
  constructor(operation: string, message: string, details?: any) {
    super("WORKSPACE_MANAGER_ERROR", message, "workspace-manager");
    this.operation = operation;
    this.details = details;
  }
}

const sessionContexts = new Map<string, SessionContext>();

export const getSessionContext = (projectId: string): SessionContext | null => {
  const sessionContext = sessionContexts.get(projectId);
  if (!sessionContext) {
    return null;
  }
  return sessionContext;
};

export const setSessionContext = (
  projectId: string,
  sessionContext: SessionContext
): void => {
  sessionContexts.set(projectId, sessionContext);
};

export const removeSessionContext = (projectId: string): void => {
  sessionContexts.delete(projectId);
};

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

  restoreWorkspace: async (
    projectId: string
  ): Promise<Result<void, WorkspaceManagerError>> => {
    const project = await dbService.getProject(projectId);
    if (!project.ok) {
      log.error(project.error, "something went wrong");
      return Err(
        new WorkspaceManagerError(
          "restoreWorkspace",
          "something went wrong",
          project.error
        )
      );
    }
    log.info(`restoring workspace with projectId:${projectId}`);
    const streamResult = await s3Service.getFileStream(
      project.value.storageLink!
    );
    if (!streamResult.ok) {
      log.error(streamResult.error, "something went wrong");
      return Err(
        new WorkspaceManagerError(
          "restoreWorkspace",
          "something went wrong",
          streamResult.error
        )
      );
    }
    const gunzip = createGunzip();
    const decompressedStream = streamResult.value.pipe(gunzip);
    log.info("decompressing files");

    const container = await dockerService.createBaseWorkspace(
      projectId,
      "code-workspace:latestV2"
    );
    if (!container.ok) {
      log.error(container.error, "something went wrong");
      return Err(
        new WorkspaceManagerError(
          "restoreWorkspace",
          "something went wrong",
          container.error
        )
      );
    }

    const loadResult = await dockerService.extractArchive(
      projectId,
      decompressedStream
    );
    if (!loadResult.ok) {
      log.error(loadResult.error, "something went wrong");
      return Err(
        new WorkspaceManagerError(
          "restoreWorkspace",
          "something went wrong",
          loadResult.error
        )
      );
    }
    await dbService.updateWorkspaceActivity(projectId, "active");
    log.info(`workspace with name:${projectId} restored successfully`);
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
      const archiveResult = await dockerService.getCompressedArchive(projectId);
      if (!archiveResult.ok) {
        log.error(
          archiveResult.error,
          `something went wrong when archiving workspace ${projectId}`
        );
        await db.updateWorkspaceActivity(projectId, "active");
        return;
      }

      const s3Key = `/workspace/${projectId}/${Date.now()}.tar.gz`;
      const s3Result = await s3Service.uploadFile(
        s3Key,
        archiveResult.value,
        "application/gzip"
      );
      if (!s3Result.ok) {
        log.error(s3Result.error, "something went wrong");
        await db.updateWorkspaceActivity(projectId, "active");
        return;
      }
      await dockerService.stopAndRemoveContainer(projectId);
      await dbService.updateStorageLink(projectId, s3Key);
      removeSessionContext(projectId);
      log.info(`Uploaded workspace ${projectId} to S3`);
      await db.updateWorkspaceActivity(projectId, "inactive");
      log.info(`Archived workspace ${projectId}`);
      return;
    } catch (error) {
      log.error(error, `Archive failed for ${projectId}:`);
      await db.updateWorkspaceActivity(projectId, "active");
      return;
    }
  },
  stopCleanupJob: async () => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
    }
  },
};
