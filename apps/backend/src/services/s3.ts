import {
  S3Client,
  CreateBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { BaseError } from "../errors/baseError.js";
import config from "../config/index.js";
import { Err, Ok, type Result } from "../errors/result.js";
import { logger } from "../utils/log.js";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Readable } from "stream";

export class S3Error extends BaseError {
  operation: string;
  details?: Record<string, unknown>;

  constructor(
    operation: string,
    message: string,
    details?: Record<string, unknown>,
    source = "s3-service"
  ) {
    super("S3_ERROR", message, source);
    this.operation = operation;
    this.details = details;
  }

  public static connectionFailed(message: string): S3Error {
    return new S3Error("connection", message, {}, "s3-service");
  }

  public static uploadFailed(key: string, error: unknown): S3Error {
    return new S3Error(
      "upload",
      `Upload failed: ${key}`,
      { error, key },
      "s3-service"
    );
  }

  public static downloadFailed(key: string, error: unknown): S3Error {
    return new S3Error(
      "download",
      `Download failed: ${key}`,
      { error, key },
      "s3-service"
    );
  }

  public static notFound(key: string): S3Error {
    return new S3Error("not_found", `Object not found: ${key}`, { key });
  }

  public static bucketCreationFailed(bucket: string, error: unknown): S3Error {
    return new S3Error(
      "bucket_creation",
      `Failed to create bucket: ${bucket}`,
      { error, bucket }
    );
  }
}

export interface UploadResult {
  key: string;
  etag: string;
  location: string;
}

export interface SignedUrlResult {
  url: string;
  expiresAt: Date;
}

export interface FileMetadata {
  key: string;
  size: number;
  lastModified: Date;
  contentType?: string;
}

export class S3Service {
  private client: S3Client;
  private bucketName: string;
  private initialized: boolean = false;

  constructor() {
    this.client = new S3Client({
      endpoint: config.s3.endpoint,
      region: config.s3.region,
      credentials: {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
      },
      forcePathStyle: config.s3.forcePathStyle,
    });

    this.bucketName = config.s3.bucketName;
  }
  public async initialize(): Promise<Result<void, S3Error>> {
    try {
      logger.info({ service: "s3" }, "Initializing S3 service...");

      await this.client.send(
        new CreateBucketCommand({
          Bucket: this.bucketName,
        })
      );

      this.initialized = true;
      logger.info(
        { service: "s3" },
        `S3 bucket '${this.bucketName}' created/verified`
      );
      return Ok(undefined);
    } catch (error: any) {
      if (
        error.name === "BucketAlreadyOwnedByYou" ||
        error.name === "BucketAlreadyExists"
      ) {
        this.initialized = true;
        logger.info(
          { service: "s3" },
          `S3 bucket '${this.bucketName}' already exists`
        );
        return Ok(undefined);
      }

      logger.error(
        { service: "s3", error },
        "Failed to initialize S3 service:",
        
      );
      return Err(S3Error.bucketCreationFailed(this.bucketName, error));
    }
  }
  public async uploadFile(
    key: string,
    body: Uint8Array | string | Readable,
    contentType?: string
  ): Promise<Result<UploadResult, S3Error>> {
    if (!this.initialized) {
      return Err(S3Error.connectionFailed("S3 service not initialized"));
    }

    try {
      logger.info({ service: "s3" }, `Uploading file: ${key}`);

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      });

      const response = await this.client.send(command);

      const result: UploadResult = {
        key,
        etag: response.ETag || "",
        location: `${config.s3.endpoint}/${this.bucketName}/${key}`,
      };

      logger.info({ service: "s3" }, `File uploaded successfully: ${key}`);
      return Ok(result);
    } catch (error) {
      logger.error({ service: "s3" }, `Upload failed for ${key}:`, error);
      return Err(S3Error.uploadFailed(key, error));
    }
  }

  public async getFile(key: string): Promise<Result<Buffer, S3Error>> {
    if (!this.initialized) {
      return Err(S3Error.connectionFailed("S3 service not initialized"));
    }

    try {
      logger.info({ service: "s3" }, `Getting file: ${key}`);

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.client.send(command);

      if (!response.Body) {
        return Err(S3Error.notFound(key));
      }

      const buffer = Buffer.from(await response.Body.transformToByteArray());
      logger.info({ service: "s3" }, `File retrieved successfully: ${key}`);
      return Ok(buffer);
    } catch (error: any) {
      if (
        error.name === "NoSuchKey" ||
        error.$metadata?.httpStatusCode === 404
      ) {
        return Err(S3Error.notFound(key));
      }

      logger.error({ service: "s3" }, `Download failed for ${key}:`, error);
      return Err(S3Error.downloadFailed(key, error));
    }
  }

  public async deleteFile(key: string): Promise<Result<void, S3Error>> {
    if (!this.initialized) {
      return Err(S3Error.connectionFailed("S3 service not initialized"));
    }

    try {
      logger.info(`Deleting file: ${key}`);

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.client.send(command);
      logger.info({ service: "s3" }, `File deleted successfully: ${key}`);
      return Ok(undefined);
    } catch (error) {
      logger.error({ service: "s3" }, `Delete failed for ${key}:`, error);
      return Err(S3Error.downloadFailed(key, error));
    }
  }

  public async getFileMetadata(
    key: string
  ): Promise<Result<FileMetadata, S3Error>> {
    if (!this.initialized) {
      return Err(S3Error.connectionFailed("S3 service not initialized"));
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.client.send(command);

      const metadata: FileMetadata = {
        key,
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        contentType: response.ContentType,
      };

      return Ok(metadata);
    } catch (error: any) {
      if (
        error.name === "NotFound" ||
        error.$metadata?.httpStatusCode === 404
      ) {
        return Err(S3Error.notFound(key));
      }

      return Err(S3Error.downloadFailed(key, error));
    }
  }

  public async getUploadUrl(
    key: string,
    expiresIn: number = 3600,
    contentType?: string
  ): Promise<Result<SignedUrlResult, S3Error>> {
    if (!this.initialized) {
      return Err(S3Error.connectionFailed("S3 service not initialized"));
    }

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
      });

      const url = await getSignedUrl(this.client, command, { expiresIn });
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      logger.info({ service: "s3" }, `Upload URL generated for: ${key}`);
      return Ok({ url, expiresAt });
    } catch (error) {
      logger.error(
        { service: "s3" },
        `Failed to generate upload URL for ${key}:`,
        error
      );
      return Err(S3Error.uploadFailed(key, error));
    }
  }

  public async getDownloadUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<Result<SignedUrlResult, S3Error>> {
    if (!this.initialized) {
      return Err(S3Error.connectionFailed("S3 service not initialized"));
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const url = await getSignedUrl(this.client, command, { expiresIn });
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      logger.info({ service: "s3" }, `Download URL generated for: ${key}`);
      return Ok({ url, expiresAt });
    } catch (error) {
      logger.error(
        { service: "s3" },
        `Failed to generate download URL for ${key}:`,
        error
      );
      return Err(S3Error.downloadFailed(key, error));
    }
  }
}
