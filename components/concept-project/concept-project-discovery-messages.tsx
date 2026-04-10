"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { LoaderCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CONCEPT_PROJECT_STAGE_LABELS,
  type ConceptProjectStage,
} from "@/lib/concept-project/shared";
import { cn } from "@/lib/utils";

import type {
  RenderMessage,
  StageProgressCard,
} from "@/components/concept-project/concept-project-discovery-shared";

function getTransientAgentActivity(stage: ConceptProjectStage, hasVisibleText: boolean) {
  if (hasVisibleText) {
    switch (stage) {
      case "what":
        return "locking project summary";
      case "for_whom":
        return "tightening audience fit";
      case "how":
        return "capturing technical shape";
      case "setup":
        return "finalizing setup plan";
    }
  }

  switch (stage) {
    case "what":
      return "drafting roadmap and product framing";
    case "for_whom":
      return "refining target audience and scope";
    case "how":
      return "mapping constraints and implementation";
    case "setup":
      return "writing setup summary and bootstrap tasks";
  }
}

function TransientAgentStatus({
  hasVisibleText,
  stage,
}: {
  hasVisibleText: boolean;
  stage: ConceptProjectStage;
}) {
  const activityLabel = getTransientAgentActivity(stage, hasVisibleText);

  return (
    <div
      aria-live="polite"
      className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-xs text-muted-foreground"
    >
      <div className="flex items-center gap-2">
        <LoaderCircleIcon aria-hidden="true" className="size-3.5 animate-spin text-foreground/70" />
        <span className="font-medium text-foreground/80">{activityLabel}</span>
      </div>
      <div aria-hidden="true" className="flex items-center gap-1.5">
        <span className="h-1 w-6 rounded-full bg-foreground/15" />
        <span className="h-1 w-10 animate-pulse rounded-full bg-foreground/35 [animation-delay:120ms]" />
        <span className="h-1 w-6 rounded-full bg-foreground/15" />
      </div>
      <span className="sr-only">{`${CONCEPT_PROJECT_STAGE_LABELS[stage]} agent is ${activityLabel}.`}</span>
    </div>
  );
}

function MessageMarkdown({ isAgent, text }: { isAgent: boolean; text: string }) {
  const mutedClass = isAgent ? "text-muted-foreground" : "text-background/80";
  const codeClass = isAgent
    ? "rounded bg-background px-1.5 py-0.5 text-foreground"
    : "rounded bg-background/15 px-1.5 py-0.5 text-background";
  const preClass = isAgent
    ? "overflow-x-auto rounded-xl border border-border bg-background px-4 py-3 text-foreground"
    : "overflow-x-auto rounded-xl border border-background/20 bg-background/10 px-4 py-3 text-background";

  return (
    <div className="mt-1 text-sm leading-6">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node: _node, ...props }) => (
            <a
              {...props}
              className="underline underline-offset-4"
              rel="noreferrer"
              target="_blank"
            />
          ),
          code: ({ children, className, node: _node, ...props }) => {
            const isBlock = Boolean(className);

            if (isBlock) {
              return (
                <code {...props} className={className}>
                  {children}
                </code>
              );
            }

            return (
              <code {...props} className={codeClass}>
                {children}
              </code>
            );
          },
          em: ({ node: _node, ...props }) => <em {...props} className="italic" />,
          hr: ({ node: _node, ...props }) => <hr {...props} className="my-4" />,
          li: ({ node: _node, ...props }) => <li {...props} className="ml-5 pl-1" />,
          ol: ({ node: _node, ...props }) => <ol {...props} className="list-decimal space-y-1" />,
          p: ({ node: _node, ...props }) => <p {...props} className="my-0" />,
          pre: ({ node: _node, ...props }) => <pre {...props} className={preClass} />,
          strong: ({ node: _node, ...props }) => <strong {...props} className="font-semibold" />,
          table: ({ node: _node, ...props }) => (
            <div className="overflow-x-auto">
              <table {...props} className="w-full border-collapse text-left text-sm" />
            </div>
          ),
          td: ({ node: _node, ...props }) => (
            <td {...props} className={`border px-3 py-2 align-top ${mutedClass}`} />
          ),
          th: ({ node: _node, ...props }) => (
            <th {...props} className="border px-3 py-2 font-semibold" />
          ),
          ul: ({ node: _node, ...props }) => <ul {...props} className="list-disc space-y-1" />,
        }}
      >
        {text || "..."}
      </ReactMarkdown>
    </div>
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
  nextStage: Exclude<ConceptProjectStage, "setup"> | "setup" | null;
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
        const showTransientAgentStatus = isAgent && message.isTransient;
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
                {showTransientAgentStatus ? (
                  <TransientAgentStatus
                    hasVisibleText={message.text.length > 0}
                    stage={message.stage}
                  />
                ) : null}
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
