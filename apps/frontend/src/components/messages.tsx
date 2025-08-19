"use client";
import { cn } from "@/lib/utils";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";

import { Message } from "./message-simple";

export function Messages({ messages }: { messages: any[] }) {
  return (
    <div className="flex flex-col gap-4 p-4">
      {messages.map((m) => (
        <Message key={m.id} chatId="" message={m} isLoading={false} />
      ))}
    </div>
  );
}

function MessageBubble({ message }: { message: any }) {
  const isUser = message.role === "user";
  return (
    <div
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[min(800px,80%)] rounded-lg border px-3 py-2",
          isUser ? "bg-accent" : "bg-background"
        )}
      >
        <MessageParts message={message} />
      </div>
    </div>
  );
}

function MessageParts({ message }: { message: any }) {
  const parts: any[] = (message as any).parts ?? [];
  if (parts.length === 0) {
    return (
      <div className="whitespace-pre-wrap text-sm">
        {(message as any).content}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {parts.map((p, idx) => {
        if (p.type === "text") {
          return (
            <div
              key={idx}
              className="whitespace-pre-wrap text-sm leading-relaxed"
            >
              {p.text}
            </div>
          );
        }

        // Handle tool parts in both legacy and current formats
        const isToolPart =
          typeof p?.type === "string" &&
          (p.type === "dynamic-tool" || p.type.startsWith("tool"));
        if (isToolPart) {
          const headerType =
            p.toolName ||
            (p.type.startsWith("tool-") ? p.type.slice(5) : "tool");
          return (
            <Tool key={idx} defaultOpen={p.state !== "output-available"}>
              <ToolHeader type={headerType} state={p.state} />
              <ToolContent>
                <ToolInput input={p.input} />
                <ToolOutput
                  output={renderToolOutput(p)}
                  errorText={p.errorText}
                />
              </ToolContent>
            </Tool>
          );
        }

        return (
          <div key={idx} className="rounded bg-muted/50 p-2 text-xs">
            {JSON.stringify(p)}
          </div>
        );
      })}
    </div>
  );
}

function renderToolOutput(p: any) {
  if (p.output == null) return null;
  if (typeof p.output === "string")
    return <div className="whitespace-pre-wrap">{p.output}</div>;
  return (
    <pre className="whitespace-pre-wrap">
      {JSON.stringify(p.output, null, 2)}
    </pre>
  );
}
