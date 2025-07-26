import { logger } from "../utils/log.js";
import type { DockerService } from "./docker.js";
import type { S3Service } from "./s3.js";
import type { DbService } from "./db.js";
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

export class WorkspaceManager {
  private log = logger.child({ service: "workspace-manager" });
  private heartbeatTimeout = 10 * 60 * 1000; // 10 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;
  private dbService: DbService;
  private dockerService: DockerService;
  private s3Service: S3Service;

  constructor(
    dockerService: DockerService,
    s3Service: S3Service,
    dbService: DbService
  ) {
    this.dockerService = dockerService;
    this.s3Service = s3Service;
    this.dbService = dbService;
  }
  public initialize(): void {
    this.log.info("Initializing WorkspaceManager with database backing");
    this.startCleanupJob();
  }
  public async registerWorkspace(
    projectId: string,
    containerId: string,
    userId: number
  ): Promise<void> {
    await this.dbService.updateWorkspaceActivity(projectId, userId, "active");
    this.log.info(
      { service: "workspaceManager" },
      `Registered workspace ${projectId}`
    );
  }

  public async updateHeartbeat(
    projectId: string
  ): Promise<Result<void, WorkspaceManagerError>> {
    const result = await this.dbService.updateHeartbeat(projectId);

    if (!result.ok) {
      return Err(
        new WorkspaceManagerError(
          "heartbeat_update",
          `Failed to update heartbeat: ${result.error.message}`
        )
      );
    }

    return Ok(undefined);
  }

  private startCleanupJob(): void {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup().catch((error) => {
        this.log.error("Cleanup job failed:", error);
      });
    }, 30 * 1000);
  }

  private async performCleanup(): Promise<void> {
    const staleWorkspaces = await this.dbService.getStaleWorkspaces(
      this.heartbeatTimeout
    );

    if (!staleWorkspaces.ok) {
      this.log.error("Failed to get stale workspaces:", staleWorkspaces.error);
      return;
    }

    for (const workspace of staleWorkspaces.value) {
      await this.archiveWorkspace(workspace.uuid);
    }
  }
  // public for test only
  public async archiveWorkspace(projectId: string): Promise<void> {
    try {
      await this.dbService.markWorkspaceArchiving(projectId);

      // Export → S3 → cleanup logic stays the same
      const exportResult = await this.dockerService.exportContainer(projectId);
      if (!exportResult.ok)
        throw new Error(`Export failed: ${exportResult.error.message}`);

      const s3Key = `workspaces/${projectId}/${Date.now()}.tar.gz`;
      const uploadResult = await this.s3Service.uploadFile(
        s3Key,
        exportResult.value,
        "application/gzip"
      );
      if (!uploadResult.ok)
        throw new Error(`Upload failed: ${uploadResult.error.message}`);

      await this.dbService.updateProjectStorageLink(
        projectId,
        uploadResult.value.location
      );
      await this.dockerService.stopAndRemoveContainer(projectId);
      await this.dbService.markWorkspaceInactive(projectId);

      this.log.info(`Archived workspace ${projectId}`);
    } catch (error) {
      this.log.error(error, `Archive failed for ${projectId}:`);
      await this.dbService.markWorkspaceActive(projectId);
    }
  }
}
