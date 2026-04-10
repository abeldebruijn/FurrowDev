"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
