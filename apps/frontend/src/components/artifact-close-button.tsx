import { X } from "lucide-react";
import { Button } from "./ui/button";
import { useArtifact } from "@/hooks/use-artifacts";

export function ArtifactCloseButton() {
  const { setArtifact } = useArtifact();

  const handleClose = () => {
    setArtifact((current) => ({
      ...current,
      isVisible: false,
    }));
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClose}
      className="h-8 w-8 p-0"
    >
      <X className="h-4 w-4" />
    </Button>
  );
}
