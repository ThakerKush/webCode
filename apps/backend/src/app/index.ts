import type z from "zod";
import { logger } from "../utils/log.js";
import { DockerService } from "../services/docker.js";
import type { DbService } from "../services/db.js";
import type { S3Service } from "../services/s3.js";
import type { WorkspaceManager } from "../services/workspaceManager.js";

type ServiceFactory<T> = () => T | Promise<T>;
type ServiceShutdown<T> = (state: Awaited<T>) => Promise<void>;

interface ServiceConfig<T> {
  factory: ServiceFactory<T>;
  shutdown?: ServiceShutdown<T>;
  instance?: T;
  initialized?: boolean;
}

export class App {
  private log = logger.child({ service: "app" });
  private static _instance: App;
  private initialized = false;

  private services = new Map<string, ServiceConfig<any>>();

  constructor() {
    this.log.info("Initializing App Instance");
  }

  public service<Service>(
    key: any,
    factory: ServiceFactory<Service>,
    shutdown?: ServiceShutdown<Service>
  ): App {
    if (this.services.has(key)) {
      this.log.info(`Service ${key} already registered, skipping`);
      return this;
    }
    this.services.set(key, { factory, shutdown, initialized: false });

    this.log.info(`Service ${key} registered`);
    return this;
  }
  public async getService<T>(key: string): Promise<T> {
    const serviceConfig = this.services.get(key);
    if (!serviceConfig) {
      throw new Error(`Service '${key}' not found. Did you register it?`);
    }

    // Lazy initialization - only create when first accessed
    if (!serviceConfig.initialized) {
      this.log.info(`Initializing service '${key}' on first access`);
      try {
        serviceConfig.instance = await serviceConfig.factory();
        serviceConfig.initialized = true;
        this.log.info(`Service '${key}' initialized successfully`);
      } catch (error) {
        this.log.error(`Failed to initialize service '${key}'`, { error });
        throw error;
      }
    }

    return serviceConfig.instance;
  }

  public async initialize(): Promise<App> {
    if (this.initialized) {
      this.log.info("App already initialized, skipping");
    }
    this.log.info("Initializing App");
    //do something idk
    return this;
  }
  public async getDocker(): Promise<DockerService> {
    const docker = await this.getService<DockerService>("docker");
    return docker;
  }
  public async getDb(): Promise<DbService> {
    const db = await this.getService<DbService>("db");
    return db;
  }
  public async getS3(): Promise<S3Service> {
    const s3 = await this.getService<S3Service>("s3");
    return s3;
  }
  public async getWorkspaceManager(): Promise<WorkspaceManager> {
    const workspaceManager =
      await this.getService<WorkspaceManager>("workspaceManager");
    return workspaceManager;
  }
}
