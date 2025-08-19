import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

interface Document {
  id: string;
  createdAt: Date;
  content: string;
}

interface VersionFooterProps {
  currentVersionIndex: number;
  documents: Document[] | undefined;
  handleVersionChange: (type: "next" | "prev" | "toggle" | "latest") => void;
}

export function VersionFooter({
  currentVersionIndex,
  documents,
  handleVersionChange,
}: VersionFooterProps) {
  if (!documents || documents.length <= 1) return null;

  return (
    <motion.div
      className="absolute bottom-0 left-0 right-0 bg-background border-t border-border p-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Version {currentVersionIndex + 1} of {documents.length}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleVersionChange("prev")}
            disabled={currentVersionIndex <= 0}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleVersionChange("next")}
            disabled={currentVersionIndex >= documents.length - 1}
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
        </div>
      </div>
    </motion.div>
  );
}
