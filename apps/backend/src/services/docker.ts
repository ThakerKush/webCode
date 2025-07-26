import Docker from "dockerode";
import { createReadStream, createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { Err, Ok, type Result } from "../errors/result.js";
import { DockerError } from "../errors/dockerError.js";
import { handleStream } from "../utils/handleStream.js";
import { logger } from "../utils/log.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { Readable } from "stream";
import { createGzip } from "zlib";
import type { DbService } from "./db.js";

export type WorkspaceInfo = {
  containerId: string;
  projectId: string;
  // cwd: string;
  todo?: Array<{
    description: string;
    status: "pending" | "in_progress" | "completed";
    priority: "low" | "medium" | "high";
  }>;
  shellSession: ShellSession;
  imageName: string;
  createdAt: Date;
  updatedAt: Date;
  status: string;
};

export type ShellSession = {
  stream: NodeJS.ReadWriteStream;
};

export class DockerService {
  private log = logger.child({ service: "docker" });
  private db: DbService;
  docker: Docker;

  constructor(db: DbService) {
    this.db = db;
    // Dockerode auto-detects the socket path and API version
    this.docker = new Docker();
  }
  // Test connection

  async ping(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch (error) {
      console.error("Docker ping failed:", error);
      return false;
    }
  }
  // Get Docker version info
  async getVersion(): Promise<Docker.DockerVersion> {
    return await this.docker.version();
  }

  async buildImage(
    contextPath: string,
    imageName: string
  ): Promise<Result<string[], DockerError>> {
    const logs: string[] = [];

    try {
      let stream = await this.docker.buildImage(
        { context: contextPath, src: ["dockerfile"] },
        { t: imageName, nocache: true }
      );

      await new Promise((resolve, reject) => {
        this.docker.modem.followProgress(
          stream,
          (error, result) => {
            if (error) {
              logs.push(`Build Error: ${error}`);
              reject(error);
            } else {
              resolve(result);
            }
          },
          (progress) => {
            if (progress.stream) {
              logs.push(progress.stream.trim());
            }
          }
        );
      });

      return Ok(logs);
    } catch (error) {
      console.error("error at docker service", error);
      return Err(DockerError.buildFailed("unknownError", logs));
    }
  }

  async makeContaier(
    imageName: string,
    projectId: string
  ): Promise<Result<WorkspaceInfo, DockerError>> {
    try {
      this.log.info("making container");

      // Check if image exists, if not build it
      try {
        const image = this.docker.getImage(imageName);
        await image.inspect();
        this.log.info("image found, proceeding to create container");
      } catch (error) {
        this.log.info("image not found, building");
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const buildResult = await this.buildImage(
          join(__dirname, "..", ".."),
          imageName
        );
        if (!buildResult.ok) {
          this.log.error({ child: "makeContainer" }, String(buildResult.error));
          return Err(buildResult.error);
        }
        this.log.info("image built successfully");
      }

      // Create and start container (this happens regardless of whether image existed or was built)
      this.log.info("creating container");
      const container = await this.docker.createContainer({
        Image: imageName,
        name: projectId,
        Cmd: ["tail", "-f", "/dev/null"],
        ExposedPorts: {
          "5173/tcp": {},
          "3000/tcp": {},
          "8080/tcp": {},
        },
        HostConfig: {
          Memory: 500 * 1024 * 1024, //500 MB of ram
          MemorySwap: 500 * 1024 * 1024,
          CpuPeriod: 100000, // 100ms period (default)
          CpuQuota: 50000, // 50ms quota = 50% of one CPU
        },
        Labels: {
          // Enable Traefik for this container
          "traefik.enable": "true",
          "traefik.docker.network": "web",

          // Main route: projectId.mydomain.com -> port 3000
          [`traefik.http.routers.${projectId}.rule`]: `Host(\`${projectId}.localhost\`)`,
          [`traefik.http.routers.${projectId}.entrypoints`]: "web",
          [`traefik.http.services.${projectId}.loadbalancer.server.port`]:
            "5173",
        },
      });
      await container.start();

      const shellResult = await this.startShellSession(projectId);
      if (!shellResult.ok) {
        this.log.error(
          { child: "getOrCreateWorkspace" },
          String(shellResult.error)
        );
        return Err(shellResult.error);
      }
      const workspaceInfo: WorkspaceInfo = {
        containerId: container.id,
        projectId,
        shellSession: shellResult.value,
        imageName,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: "running",
        // cwd: "/workspace",
      };
      return Ok(workspaceInfo);
    } catch (error) {
      this.log.error({ child: "makeContainer" }, String(error));
      return Err(DockerError.containerError("unknownError"));
    }
  }

  async getOrCreateWorkspace(
    projectId: string,
    userId: number,
    imageName: string
  ): Promise<Result<WorkspaceInfo, DockerError>> {
    try {
      let container = this.docker.getContainer(projectId);
      let containerInfo;
      // if getting container fails then fetch s3??
      try {
        containerInfo = await container.inspect();
      } catch (err) {
        const createResult = await this.makeContaier(imageName, projectId);
        if (!createResult.ok) {
          this.log.error(String(createResult.error), {
            child: "getOrCreateWorkspace",
          });
          return Err(createResult.error);
        }
        return createResult;
      }

      const shellResult = await this.startShellSession(projectId);
      if (!shellResult.ok) {
        this.log.error(
          { child: "getOrCreateWorkspace" },
          String(shellResult.error)
        );
        return Err(shellResult.error);
      }

      const workspaceInfo: WorkspaceInfo = {
        containerId: containerInfo.Id,
        projectId,
        shellSession: shellResult.value,
        imageName: containerInfo.Config.Image,
        createdAt: new Date(containerInfo.Created), // umm not sure if this is right...but okay
        updatedAt: new Date(), // Or use containerInfo.State.StartedAt
        status: containerInfo.State.Status,
      };
      return Ok(workspaceInfo);
    } catch (error) {
      console.error("getOrCreateWorkspaceError:", error);
      return Err(DockerError.getOrCreateError(String(error)));
    }
  }

  async executeCommand(
    workspaceId: string,
    command: string[]
  ): Promise<Result<{ stdout: string; stderr: string }, DockerError>> {
    try {
      const container = this.docker.getContainer(workspaceId);

      const execStream = await (
        await container.exec({
          Cmd: command,
          AttachStdin: true,
          AttachStderr: true,
          AttachStdout: true,
        })
      ).start({ hijack: true });
      const { stdout, stderr } = await handleStream(execStream, {
        isTTY: false,
        collect: true,
      });
      console.log(stdout, stderr);
      return Ok({ stdout: stdout || "", stderr: stderr || "" });
    } catch (error) {
      console.error("executeCommand", error);
      return Err(DockerError.containerError("unknownError")); // fix this later
    }
  }
  async startShellSession(
    workspaceId: string
  ): Promise<Result<ShellSession, DockerError>> {
    try {
      const container = this.docker.getContainer(workspaceId);
      const exec = await container.exec({
        Cmd: ["/bin/bash"],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
        WorkingDir: "/workspace",
      });

      const stream = await exec.start({ hijack: true, stdin: true });

      const shellSession: ShellSession = {
        stream,
      };

      return Ok(shellSession);
    } catch (error) {
      return Err(new DockerError("startShellSession", JSON.stringify(error)));
    }
  }
  async exportContainer(
    projectId: string
  ): Promise<Result<Readable, DockerError>> {
    try {
      this.log.info(
        { child: "exportContainerStream" },
        `Exporting container ${projectId} as stream`
      );

      const container = this.docker.getContainer(projectId);
      const commitResult = await container.commit({
        repo: `archived-${projectId}`,
        tag: "latest",
      });

      const image = this.docker.getImage(commitResult.Id);
      const exportStream = await image.get();

      // Create gzip compression stream
      const gzipStream = createGzip();

      // Return compressed stream (memory efficient)
      const compressedStream = exportStream.pipe(gzipStream);
      //cleanup after the stream is read
      compressedStream.on("end", async () => {
        try {
          await image.remove({ force: true });
        } catch (cleanupError) {
          this.log.warn(
            { error: cleanupError },
            `Failed to cleanup image ${commitResult.Id}`
          );
        }
      });

      return Ok(compressedStream);
    } catch (error) {
      return Err(DockerError.containerError(`Export failed ${error}`));
    }
  }

  async stopAndRemoveContainer(
    projectId: string
  ): Promise<Result<void, DockerError>> {
    try {
      const container = this.docker.getContainer(projectId);
      await container.stop({ t: 10 });
      await container.remove({ force: true });

      this.log.info(
        { child: "stopAndRemoveContainer" },
        `Container ${projectId} stopped and removed`
      );
      return Ok(undefined);
    } catch (error) {
      return Err(DockerError.containerError(`Stop and remove failed ${error}`));
    }
  }
}
