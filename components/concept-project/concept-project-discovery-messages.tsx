"use client";

import { ChatMessages } from "@/components/chat/chat-messages";
import { Button } from "@/components/ui/button";
import {
  CONCEPT_PROJECT_STAGE_LABELS,
  type ConceptProjectStage,
} from "@/lib/concept-project/shared";

import type {
  RenderMessage,
  StageProgressCard,
} from "@/components/concept-project/concept-project-discovery-shared";

type ConceptProjectDiscoveryMessagesProps = {
  canProgressToNextStage: boolean;
  contentClassName?: string;
  hasRoadmap: boolean;
  isArchived?: boolean;
  isSubmitting: boolean;
  latestFinishedAgentMessageId?: string;
  latestUserMessageId?: string;
  messages: RenderMessage[];
  messagesEndRef?: React.RefObject<HTMLDivElement | null>;
  nextStage: Exclude<ConceptProjectStage, "grill_me"> | null;
  onProgressToNextStage: () => void;
  onSuggestOptions: () => void;
  progressCard: StageProgressCard | null;
};

export function ConceptProjectDiscoveryMessages({
  canProgressToNextStage,
  contentClassName,
  hasRoadmap,
  isArchived = false,
  isSubmitting,
  latestFinishedAgentMessageId,
  latestUserMessageId,
  messages,
  messagesEndRef,
  nextStage,
  onProgressToNextStage,
  onSuggestOptions,
  progressCard,
}: ConceptProjectDiscoveryMessagesProps) {
  return (
    <ChatMessages
      className={[hasRoadmap ? "pt-44 sm:pt-48" : null, contentClassName].filter(Boolean).join(" ")}
      messages={messages}
      messagesEndRef={messagesEndRef}
      renderAssistantLabel={(message) => (
        <span className="text-xs font-semibold font-mono text-muted-foreground">
          {`${CONCEPT_PROJECT_STAGE_LABELS[message.meta?.stage ?? "what"]} agent:`}
        </span>
      )}
      renderMessageActions={(message) => {
        const showSuggestOptionsAction =
          !isSubmitting &&
          latestFinishedAgentMessageId === message.id &&
          message.role === "assistant" &&
          !message.isTransient;
        const showProgressAction =
          canProgressToNextStage &&
          nextStage !== null &&
          !isSubmitting &&
          latestUserMessageId === message.id &&
          message.role === "user";

        if (showSuggestOptionsAction && !isArchived) {
          return (
            <div className="flex justify-end">
              <Button className="cursor-pointer" onClick={onSuggestOptions} type="button">
                I don't know, suggest 5 options
              </Button>
            </div>
          );
        }

        if (showProgressAction && nextStage && progressCard) {
          return (
            <div className="space-y-3">
              <div className="mr-auto max-w-[85%] rounded-2xl border border-border bg-muted/50 px-4 py-3">
                <p className="text-xs font-semibold font-mono text-muted-foreground">
                  {`${progressCard.title}:`}
                </p>
                <p className="mt-1 text-sm leading-6 text-foreground">{progressCard.body}</p>
              </div>
              <div className="flex justify-end">
                <Button className="cursor-pointer" onClick={onProgressToNextStage} type="button">
                  {progressCard.buttonLabel}
                </Button>
              </div>
            </div>
          );
        }

        return null;
      }}
    />
  );
}
