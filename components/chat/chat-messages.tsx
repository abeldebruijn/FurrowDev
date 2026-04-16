"use client";

import type { ReactNode, RefObject } from "react";

import { MarkdownContent } from "@/components/ui/markdown-content";
import { cn } from "@/lib/utils";

import type { ChatRenderMessage } from "./chat-types";

type ChatMessagesProps<TMeta = undefined> = {
  assistantTone?: "default" | "inverse";
  className?: string;
  messages: ChatRenderMessage<TMeta>[];
  messagesEndRef?: RefObject<HTMLDivElement | null>;
  renderAssistantLabel?: (message: ChatRenderMessage<TMeta>) => ReactNode;
  renderMessageActions?: (message: ChatRenderMessage<TMeta>) => ReactNode;
  renderStreamingState?: ReactNode;
  userTone?: "default" | "inverse";
};

export function ChatMessages<TMeta = undefined>({
  assistantTone = "default",
  className,
  messages,
  messagesEndRef,
  renderAssistantLabel,
  renderMessageActions,
  renderStreamingState,
  userTone = "inverse",
}: ChatMessagesProps<TMeta>) {
  return (
    <div className={cn("flex-1 space-y-3 overflow-y-auto px-6 py-5", className)}>
      {messages.map((message) => {
        const isAssistant = message.role === "assistant";
        const actions = renderMessageActions?.(message);

        return (
          <div key={message.id} className="space-y-3">
            <div className={isAssistant ? "mr-auto max-w-[85%]" : "ml-auto max-w-[60ch]"}>
              <div
                className={cn(
                  "rounded-2xl border px-4 py-3",
                  isAssistant
                    ? "border-border bg-muted/50"
                    : "border-foreground bg-accent text-accent-foreground",
                )}
              >
                {isAssistant ? (
                  <div className="flex items-center gap-2">{renderAssistantLabel?.(message)}</div>
                ) : null}
                <MarkdownContent
                  className={
                    isAssistant
                      ? "mt-1 text-sm leading-6 text-muted-foreground"
                      : "mt-1 text-sm leading-6 text-foreground/80"
                  }
                  text={message.content || "..."}
                  tone={isAssistant ? assistantTone : userTone}
                />
              </div>
            </div>

            {actions ? actions : null}
          </div>
        );
      })}

      {renderStreamingState ? renderStreamingState : null}

      {messagesEndRef ? <div aria-hidden="true" ref={messagesEndRef} /> : null}
    </div>
  );
}
