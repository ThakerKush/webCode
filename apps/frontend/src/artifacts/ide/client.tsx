import React, { useState, useEffect, useMemo } from "react";
import { DockerIDE } from "@/components/ide";
import type { UIArtifact } from "@/components/artifact";
import type { ChatMessage } from "codeAgent/types/chat";

interface IDEArtifactProps {
  title: string;
  content: string;
  mode: "edit" | "diff";
  status: UIArtifact["status"];
  currentVersionIndex: number;
  suggestions: any[];
  onSaveContent: (content: string, debounce: boolean) => void;
  isInline: boolean;
  isCurrentVersion: boolean;
  getDocumentContentById: (index: number) => string;
  isLoading: boolean;
  metadata: any;
  setMetadata: (metadata: any) => void;
}

interface IDEMetadata {
  containerId?: string;
  userId?: number;
  wsUrl?: string;
  files?: { [path: string]: string };
  workspaceStatus?: "loading" | "ready" | "error";
  workspaceMessage?: string;
}

function IDEArtifactContent({
  title,
  content,
  status,
  metadata,
  setMetadata,
}: IDEArtifactProps) {
  const [files, setFiles] = useState<{ [path: string]: string }>({});
  const [workspaceReady, setWorkspaceReady] = useState(false);

  // Parse content to extract files from data-codeDelta streaming
  useEffect(() => {
    if (content && typeof content === "string") {
      try {
        // Try to parse as JSON if it's structured data
        const parsed = JSON.parse(content);
        if (parsed.files) {
          setFiles(parsed.files);
          setMetadata({ ...metadata, files: parsed.files });
        }
        if (parsed.containerId) {
          setMetadata({ ...metadata, containerId: parsed.containerId });
          setWorkspaceReady(true);
        }
      } catch {
        // If not JSON, treat as plain text file content
        // This would be for single file scenarios
        setFiles((prev) => ({ ...prev, "main.txt": content }));
      }
    }
  }, [content, metadata, setMetadata]);

  // Extract metadata for IDE connection
  const ideMetadata: IDEMetadata = useMemo(() => {
    return {
      containerId: metadata?.containerId || "",
      userId: metadata?.userId || 1,
      wsUrl: metadata?.wsUrl || "ws://localhost:8080",
      files: files,
      ...metadata,
    };
  }, [metadata, files]);

  if (!ideMetadata.containerId || !workspaceReady) {
    return (
      <div className="flex items-center justify-center h-96 bg-muted/20 rounded-lg">
        <div className="text-center">
          <div className="text-muted-foreground mb-2">IDE Workspace</div>
          <div className="text-sm text-muted-foreground">
            {status === "streaming"
              ? "Initializing workspace..."
              : "Waiting for workspace connection"}
          </div>
          {ideMetadata.workspaceMessage && (
            <div className="text-xs text-muted-foreground mt-1">
              {ideMetadata.workspaceMessage}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-[600px] bg-background border rounded-lg overflow-hidden">
      <DockerIDE
        containerId={ideMetadata.containerId || ""}
        wsUrl={ideMetadata.wsUrl || "ws://localhost:8080"}
        userId={ideMetadata.userId || 1}
      />
    </div>
  );
}

export const ideArtifact = {
  kind: "ide" as const,
  label: "IDE",
  description: "Interactive development environment",
  content: IDEArtifactContent,
  initialize: ({
    documentId,
    setMetadata,
  }: {
    documentId: string;
    setMetadata: (metadata: any) => void;
  }) => {
    // Initialize IDE-specific metadata
    setMetadata({
      containerId: "", // Will be set from streaming data
      userId: 1, // Default user ID
      wsUrl: "ws://localhost:8080",
      workspaceStatus: "loading",
      workspaceMessage: "Preparing workspace...",
    });
  },
};
