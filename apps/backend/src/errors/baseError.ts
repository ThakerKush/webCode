export type ErrorContext = Record<string, unknown>;

export class BaseError extends Error {
  type: string;
  message: string;
  source: string;
  ignoreLog: boolean;

  constructor(
    type: string,
    message?: string,
    source?: string,
    ignoreLog = false
  ) {
    super();

    Object.setPrototypeOf(this, new.target.prototype);

    this.type = type;
    this.message =
      message ??
      "An unknown error occurred. If this persists, please contact us.";
    this.source = source ?? "unspecified";
    this.ignoreLog = ignoreLog;
  }

  toJSON(): Record<PropertyKey, string> {
    return {
      type: this.type,
      message: this.message,
      source: this.source,
    };
  }
}
