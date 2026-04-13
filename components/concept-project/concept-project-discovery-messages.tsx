"use client";

import { Button } from "@/components/ui/button";
import { MarkdownContent } from "@/components/ui/markdown-content";
import {
  CONCEPT_PROJECT_STAGE_LABELS,
  type ConceptProjectStage,
} from "@/lib/concept-project/shared";
import { cn } from "@/lib/utils";

import type {
  RenderMessage,
  StageProgressCard,
} from "@/components/concept-project/concept-project-discovery-shared";

function MessageMarkdown({ isAgent, text }: { isAgent: boolean; text: string }) {
  return (
    <MarkdownContent
      className={
        isAgent
          ? "mt-1 text-sm leading-6 text-muted-foreground"
          : "mt-1 text-sm leading-6 text-background/80"
      }
      text={text || "..."}
      tone={isAgent ? "default" : "inverse"}
    />
  );
}

type ConceptProjectDiscoveryMessagesProps = {
  canProgressToNextStage: boolean;
  contentClassName?: string;
  hasRoadmap: boolean;
  isArchived?: boolean;
  isSubmitting: boolean;
  latestFinishedAgentMessageId?: string;
  latestUserMessageId?: string;
  messages: RenderMessage[];
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
  nextStage,
  onProgressToNextStage,
  onSuggestOptions,
  progressCard,
}: ConceptProjectDiscoveryMessagesProps) {
  return (
    <div
      className={cn(
        "flex-1 space-y-3 overflow-y-auto px-6 py-5",
        hasRoadmap && "pt-44 sm:pt-48",
        contentClassName,
      )}
    >
      {messages.map((message) => {
        const isAgent = message.type === "agent";
        const showSuggestOptionsAction =
          !isSubmitting &&
          latestFinishedAgentMessageId === message.id &&
          isAgent &&
          !message.isTransient;
        const showProgressAction =
          canProgressToNextStage &&
          nextStage !== null &&
          !isSubmitting &&
          latestUserMessageId === message.id &&
          !isAgent;

        return (
          <div key={message.id} className="space-y-3">
            <div className={isAgent ? "mr-auto max-w-[85%]" : "ml-auto max-w-[60ch]"}>
              <div
                className={cn(
                  "rounded-2xl border px-4 py-3",
                  isAgent
                    ? "border-border bg-muted/50"
                    : "border-foreground bg-accent text-accent-foreground",
                )}
              >
                <div className="flex items-center gap-2">
                  {isAgent ? (
                    <span className="text-xs font-semibold font-mono text-muted-foreground">
                      {`${CONCEPT_PROJECT_STAGE_LABELS[message.stage]} agent:`}
                    </span>
                  ) : null}
                </div>
                <MessageMarkdown isAgent={isAgent} text={message.text} />
              </div>
            </div>
            {showSuggestOptionsAction && !isArchived ? (
              <div className="flex justify-end">
                <Button className="cursor-pointer" onClick={onSuggestOptions} type="button">
                  I don't know, suggest 5 options
                </Button>
              </div>
            ) : null}
            {showProgressAction && nextStage && progressCard ? (
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
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
