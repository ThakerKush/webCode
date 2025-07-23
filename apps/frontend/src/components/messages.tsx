"use client"; // very basic message component for now
import { AnimatePresence, motion } from "framer-motion";
import { UIMessage } from "ai";
import { cn } from "@/lib/utils";
import { memo, useState } from "react";
import { Button } from "./ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { PencilIcon } from "lucide-react";

export const PureMessage = ({
  chatId,
  message,
  isLoading = false,
  onEdit,
  showActions = false,
}: {
  chatId: number;
  message: UIMessage;
  isLoading?: boolean;
  onEdit?: (messageId: string) => void;
  showActions?: boolean;
}) => {
  return (
    <div className={cn("flex gap-4 w-full justify-end px-4")}>
      how will you show up I think this is gapy thingy?
    </div>
  );
};

export const PreviewMessage = memo(PureMessage);
