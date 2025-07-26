import { BaseError } from "./baseError.js";

export class DockerError extends BaseError {
  operation: string;
  details?: Record<string, unknown>;

  constructor(
    operation: string,
    message: string,
    details?: Record<string, unknown>,
    source = "docker-service"
  ) {
    super("DOCKER_ERROR", message, source);
    this.operation = operation;
    this.details = details;
  }

  public static buildFailed(message: string, logs: string[]): DockerError {
    return new DockerError("build", message, { logs }, "docker-service");
  }

  public static containerError(message: string, error?: unknown): DockerError {
    return new DockerError("container_create", message, { error });
  }

  public static workspaceExists(name: string): DockerError {
    return new DockerError(
      "workspace_exists",
      `Workspace ${name} already exists`,
      { name }
    );
  }

  public static getOrCreateError(message: string) {
    return new DockerError("get_or_create_error", message);
  }
}
