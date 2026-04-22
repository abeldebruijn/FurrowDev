"use client";

import type { CSSProperties, FormEventHandler, KeyboardEventHandler, RefObject } from "react";

import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatMessages } from "@/components/chat/chat-messages";
import type { ChatRenderMessage } from "@/components/chat/chat-types";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";

import { ButtonGroup } from "../ui/button-group";
import { CreateIdeaDialog } from "./create-idea-dialog";
import { VisionCollaboratorsDialog } from "./vision-collaborators-dialog";
import { VisionSettingsDialog } from "./vision-settings-dialog";
import { VisionSummarySidebar, VisionSummarySidebarTrigger } from "./vision-summary-sidebar";
import type { VisionWorkspaceProps } from "./vision-workspace-types";

type VisionWorkspaceViewProps = {
  canConvertToIdea: boolean;
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
  roadmapItems: VisionWorkspaceProps["roadmapItems"];
  routeError: string | null;
  scrollToBottom: (options?: { resumeTypingFollow?: boolean }) => void;
  sendError: Error | undefined;
  summary: VisionWorkspaceProps["summary"];
  visionId: string;
};

export function VisionWorkspaceView(props: VisionWorkspaceViewProps) {
  return (
    <SidebarProvider
      className="min-h-0"
      defaultOpen={false}
      style={
        {
          "--sidebar-width": "30rem",
        } as CSSProperties
      }
    >
      <VisionWorkspaceMain {...props} />

      <VisionSummarySidebar summary={props.summary} />
    </SidebarProvider>
  );
}

function VisionWorkspaceMain({
  canConvertToIdea,
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
  roadmapItems,
  routeError,
  scrollToBottom,
  sendError,
  visionId,
}: Omit<VisionWorkspaceViewProps, "summary">) {
  const { isMobile, open } = useSidebar();

  return (
    <div className="min-w-0 flex-1">
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
              <ButtonGroup>
                <VisionCollaboratorsDialog
                  canManage={canManageCollaborators}
                  collaborators={collaborators}
                  eligibleCollaborators={eligibleCollaborators}
                  onAdd={onAddCollaborator}
                  onRemove={onRemoveCollaborator}
                  ownerName={ownerName}
                  ownerUserId={ownerUserId}
                />

                <VisionSettingsDialog
                  canManage={canManageCollaborators}
                  onTitleChange={onTitleChange}
                  projectId={projectId}
                  title={currentTitle}
                  visionId={visionId}
                />
              </ButtonGroup>

              <VisionSummarySidebarTrigger />

              {canConvertToIdea ? (
                <CreateIdeaDialog
                  projectId={projectId}
                  roadmapItems={roadmapItems}
                  title={currentTitle}
                  visionId={visionId}
                />
              ) : null}
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
        shellClassName="transition-[right] duration-200 ease-linear"
        shellStyle={!isMobile && open ? { right: "var(--sidebar-width)" } : undefined}
      />
    </div>
  );
}
