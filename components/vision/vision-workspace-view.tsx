"use client";

import type { FormEventHandler, KeyboardEventHandler, RefObject } from "react";

import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatMessages } from "@/components/chat/chat-messages";
import type { ChatRenderMessage } from "@/components/chat/chat-types";

import { VisionCollaboratorsDialog } from "./vision-collaborators-dialog";
import { VisionSettingsDialog } from "./vision-settings-dialog";
import type { VisionWorkspaceProps } from "./vision-workspace-types";

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
  messages: ChatRenderMessage[];
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
        <ChatMessages
          messages={messages}
          messagesEndRef={messagesEndRef}
          renderAssistantLabel={() => (
            <span className="text-xs font-semibold font-mono text-muted-foreground">
              Vision agent:
            </span>
          )}
        />
      </section>

      <ChatComposer
        composerFormRef={composerFormRef}
        composerShellRef={composerShellRef}
        header={
          <div className="flex items-end justify-between gap-3">
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
        }
        helperContent={
          routeError || sendError ? (
            <div className="space-y-1">
              <p className="text-xs text-destructive">
                {routeError || sendError?.message || "Failed to send the message."}
              </p>
            </div>
          ) : null
        }
        input={input}
        inputId="vision-message-input"
        inputLabel="Message the vision agent"
        isAtBottom={isAtBottom}
        isSubmitDisabled={!input.trim() || isSubmitting}
        isSubmitting={isSubmitting}
        onInputChange={onInputChange}
        onKeyDown={onComposerKeyDown}
        onScrollToBottom={() => scrollToBottom({ resumeTypingFollow: true })}
        onSubmit={onSubmit}
        placeholder="Answer the current question or add more detail."
      />
    </>
  );
}
