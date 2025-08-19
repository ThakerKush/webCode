import { useEffect } from "react";
import { useDataStream } from "@/components/data-stream-provider";
import { useArtifact } from "./use-artifacts";
import type { CustomUIDataTypes } from "codeAgent/types/chat";

export function useArtifactStream() {
  const { dataStream } = useDataStream();
  const { artifact, setArtifact, setMetadata } = useArtifact();

  useEffect(() => {
    // Process the latest data stream items
    if (dataStream.length === 0) return;

    const latestData = dataStream[dataStream.length - 1];

    switch (latestData.type) {
      case "data-codeDelta":
        // Handle code delta updates from the write tool
        const codeData = latestData.data as CustomUIDataTypes["codeDelta"];

        // Initialize or update the IDE artifact with the new code
        setArtifact((current) => {
          if (current.kind !== "ide" || current.documentId === "init") {
            // Create new IDE artifact
            return {
              ...current,
              kind: "ide",
              title: "IDE Workspace",
              documentId: "workspace-" + Date.now(),
              isVisible: true,
              status: "streaming",
              content: JSON.stringify({
                files: { [codeData.path]: codeData.content },
              }),
            };
          } else {
            // Update existing artifact with new file content
            let existingFiles = {};
            try {
              const parsed = JSON.parse(current.content || "{}");
              existingFiles = parsed.files || {};
            } catch {
              existingFiles = {};
            }

            return {
              ...current,
              content: JSON.stringify({
                files: {
                  ...existingFiles,
                  [codeData.path]: codeData.content,
                },
              }),
              status: "streaming",
            };
          }
        });
        break;

      case "data-workspace":
        // Handle workspace status updates
        const workspaceData = latestData.data as CustomUIDataTypes["workspace"];

        setMetadata((current: any) => ({
          ...current,
          workspaceStatus: workspaceData.status,
          workspaceMessage: workspaceData.message,
        }));

        // If workspace is ready, get the container ID from the current session
        if (workspaceData.status === "ready") {
          setArtifact((current) => ({
            ...current,
            status: "idle",
          }));

          // Set container ID - this should come from the chat session
          // For now we'll use a placeholder that matches the backend pattern
          setMetadata((current: any) => ({
            ...current,
            containerId:
              window.location.pathname.split("/").pop() || "workspace",
          }));
        }

        // Show artifact when workspace starts loading
        if (workspaceData.status === "loading") {
          setArtifact((current) => {
            if (current.documentId === "init") {
              return {
                ...current,
                kind: "ide",
                title: "IDE Workspace",
                documentId: "workspace-" + Date.now(),
                isVisible: true,
                status: "streaming",
                content: "",
              };
            }
            return current;
          });
        }
        break;
    }
  }, [dataStream, setArtifact, setMetadata]);

  return {
    isProcessingStream: artifact.status === "streaming",
  };
}
