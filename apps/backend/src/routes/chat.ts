import { dockerService } from "../services/docker.js";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/log.js";
import { dbService } from "../services/db.js";
import { workspaceManager } from "../services/workspaceManager.js";
import { s3Service } from "../services/s3.js";
import { Err } from "../errors/result.js";
import { error } from "console";
import { createGunzip } from "zlib";
const log = logger.child({ service: "testWorkspaceLifecycle" });

export async function executeWorkspaceLifecycle() {
  const uuid = uuidv4();
  const imageName = `code-workspace:latestV2`;
  
  const result = await dockerService.getOrCreateWorkspace(uuid, 1, imageName);
  log.info(imageName, uuid);
  if (!result.ok) {
    log.error(result.error, "something went wrong");
    throw result.error;
  }
  const dbResult = await dbService.createProject(uuid, 1);
  if (!dbResult.ok) {
    log.error({ error: dbResult.error }, "something went wrong ");
  }

  log.info(`workspace with name:${uuid} created successfully`);

  await workspaceManager.archiveWorkspace(uuid);

  log.info(`workspace with name:${uuid} archived successfully`);
}

export async function restoreWorkspace(projectId: string, s3Key: string) {
  // Request controller responsible for getting the s3Key from project Id
  try {
    log.info(
      `restoring workspace with projectId:${projectId} and s3Key:${s3Key}`
    );
    const streamResult = await s3Service.getFileStream(s3Key);
    if (!streamResult.ok) {
      log.error(streamResult.error, "Something went wrong when downloading");
      throw streamResult.error; // Ideally you wanna return this, when this is in the docker service
    }

    const gunzip = createGunzip();
    const decompressedStream = streamResult.value.pipe(gunzip);

    const loadResult =
      await dockerService.loadImageFromStream(decompressedStream);
    if (!loadResult.ok) {
      log.error(
        { error: loadResult.error },
        "Something went wrong when loading the image"
      );
    }
  } catch (error) {
    log.error({ error: error }, "unexpected error");
    throw error;
  }
}
