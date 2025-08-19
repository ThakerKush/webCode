import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "./ui/button";
import type { UIArtifact } from "./artifact";

interface ArtifactActionsProps {
  artifact: UIArtifact;
  currentVersionIndex: number;
  handleVersionChange: (type: "next" | "prev" | "toggle" | "latest") => void;
  isCurrentVersion: boolean;
  mode: "edit" | "diff";
  metadata: any;
  setMetadata: (metadata: any) => void;
}

export function ArtifactActions({
  artifact,
  currentVersionIndex,
  handleVersionChange,
  isCurrentVersion,
  mode,
}: ArtifactActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {!isCurrentVersion && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleVersionChange("prev")}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleVersionChange("next")}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleVersionChange("latest")}
            className="h-8 w-8 p-0"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}
