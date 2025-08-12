import { AsyncLocalStorage } from "async_hooks";
import type { WorkspaceInfo } from "../services/docker.js";

export interface SessionContext {
  projectId: string;
  workspaceInfo: WorkspaceInfo;
  runCommand?: string;
  buildCommand?: string;
  projectDescription?: string;
}

class SessionContextManager {
  private static instance: SessionContextManager;
  private asyncLocalStorage = new AsyncLocalStorage<SessionContext>();

  private constructor() {}

  async run<T>(context: SessionContext, cb: () => T): Promise<T> {
    console.log("Running context", context);
    return this.asyncLocalStorage.run<T>(context, cb);
  }

  getContext(): SessionContext | undefined {
    return this.asyncLocalStorage.getStore();
  }

  static getInstance(): SessionContextManager {
    if (!SessionContextManager.instance) {
      SessionContextManager.instance = new SessionContextManager();
    }
    return SessionContextManager.instance;
  }
}

export const sessionContext = SessionContextManager.getInstance();
