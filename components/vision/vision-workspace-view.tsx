"use client";

import type { FormEventHandler, KeyboardEventHandler, RefObject } from "react";
import { ArrowDownIcon, CommandIcon, CornerDownLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { cn } from "@/lib/utils";

import { VisionCollaboratorsDialog } from "./vision-collaborators-dialog";
import { VisionSettingsDialog } from "./vision-settings-dialog";
import type { RenderMessage, VisionWorkspaceProps } from "./vision-workspace-types";

type VisionWorkspaceViewProps = {
  canManageCollaborators: boolean;
  collaborators: VisionWorkspaceProps["initialCollaborators"];
  composerFormRef: RefObject<HTMLFormElement | null>;
  composerShellRef: RefObject<HTMLDivElement | null>;
  contentShellRef: RefObject<HTMLDivElement | null>;
  currentTitle: string;
  eligibleCollaborators: VisionWorkspaceProps["eligibleCollaborators"];
  input: string;
  isAtBottom: boolean;
  isSubmitting: boolean;
  messages: RenderMessage[];
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onAddCollaborator: (userId: string) => Promise<void>;
  onComposerKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
  onInputChange: (value: string) => void;
  onRemoveCollaborator: (userId: string) => Promise<void>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onTitleChange: (title: string) => void;
  ownerName: string;
  ownerUserId: string;
  projectId: string;
  routeError: string | null;
  scrollToBottom: (options?: { resumeTypingFollow?: boolean }) => void;
  sendError: Error | undefined;
  visionId: string;
};

export function VisionWorkspaceView({
  canManageCollaborators,
  collaborators,
  composerFormRef,
  composerShellRef,
  contentShellRef,
  currentTitle,
  eligibleCollaborators,
  input,
  isAtBottom,
  isSubmitting,
  messages,
  messagesEndRef,
  onAddCollaborator,
  onComposerKeyDown,
  onInputChange,
  onRemoveCollaborator,
  onSubmit,
  onTitleChange,
  ownerName,
  ownerUserId,
  projectId,
  routeError,
  scrollToBottom,
  sendError,
  visionId,
}: VisionWorkspaceViewProps) {
  return (
    <>
      <section className="grid gap-6" ref={contentShellRef}>
        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
          {messages.map((message) => {
            const isAssistant = message.role === "assistant";

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
                    <div className="flex items-center gap-2">
                      {isAssistant ? (
                        <span className="text-xs font-semibold font-mono text-muted-foreground">
                          Vision agent:
                        </span>
                      ) : null}
                    </div>
                    <MarkdownContent
                      className={
                        isAssistant
                          ? "mt-1 text-sm leading-6 text-muted-foreground"
                          : "mt-1 text-sm leading-6 text-foreground/80"
                      }
                      text={message.content || "..."}
                      tone={isAssistant ? "default" : "inverse"}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {isSubmitting ? (
            <div className="space-y-3">
              <div className="mr-auto max-w-[85%] rounded-2xl border border-border bg-muted/50 px-4 py-3">
                <p className="text-xs font-semibold font-mono text-muted-foreground">
                  Vision agent:
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Thinking...</p>
              </div>
            </div>
          ) : null}

          <div aria-hidden="true" ref={messagesEndRef} />
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20" ref={composerShellRef}>
        <div className="mx-auto w-full max-w-240 px-4 pb-6 sm:px-6">
          <div className="mb-3 flex h-14 justify-center">
            {!isAtBottom ? (
              <Button
                aria-label="Scroll to latest message"
                className="size-11 rounded-full shadow-md"
                onClick={() => scrollToBottom({ resumeTypingFollow: true })}
                size="icon"
                type="button"
              >
                <ArrowDownIcon className="size-5" />
              </Button>
            ) : null}
          </div>

          <form onSubmit={onSubmit} ref={composerFormRef}>
            <div className="mb-2 flex items-end justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-muted-foreground">{currentTitle}</div>
              </div>

              <div className="flex items-center gap-2">
                <VisionSettingsDialog
                  canManage={canManageCollaborators}
                  onTitleChange={onTitleChange}
                  projectId={projectId}
                  title={currentTitle}
                  visionId={visionId}
                />

                <VisionCollaboratorsDialog
                  canManage={canManageCollaborators}
                  collaborators={collaborators}
                  eligibleCollaborators={eligibleCollaborators}
                  onAdd={onAddCollaborator}
                  onRemove={onRemoveCollaborator}
                  ownerName={ownerName}
                  ownerUserId={ownerUserId}
                />
              </div>
            </div>

            <div className="relative rounded-lg bg-background">
              <label className="sr-only" htmlFor="vision-message-input">
                Message the vision agent
              </label>
              <textarea
                aria-label="Message the vision agent"
                className="min-h-32 w-full rounded-lg border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground"
                id="vision-message-input"
                onChange={(event) => onInputChange(event.target.value)}
                onKeyDown={onComposerKeyDown}
                placeholder="Answer the current question or add more detail."
                value={input}
              />

              <Button
                className="absolute right-2 bottom-4"
                disabled={!input.trim() || isSubmitting}
                type="submit"
              >
                {isSubmitting ? (
                  "Thinking..."
                ) : (
                  <>
                    Send
                    <div className="flex">
                      <CommandIcon className="size-2.5" />
                      <CornerDownLeftIcon className="size-2.5" />
                    </div>
                  </>
                )}
              </Button>
            </div>

            {(routeError || sendError) && (
              <div className="flex items-center justify-between gap-3 bg-background p-2">
                <div className="space-y-1">
                  <p className="text-xs text-destructive">
                    {routeError || sendError?.message || "Failed to send the message."}
                  </p>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </>
  );
}
