"use client";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useRouter, useSearchParams } from "next/navigation";

import type { ConceptProjectAgentUIMessage } from "@/lib/agents/concept-project";
import {
  CONCEPT_PROJECT_STAGE_LABELS,
  conceptProjectStages,
  getConceptProjectStageIndex,
  getConceptProjectWordCount,
  type ConceptProjectStage,
} from "@/lib/concept-project/shared";
import { queries } from "@/zero/queries";
import { Button } from "@/components/ui/button";
import { ArrowDownIcon, CommandIcon, CornerDownLeftIcon } from "lucide-react";

const AUTO_SCROLL_BOTTOM_THRESHOLD_PX = 24;
const AUTO_SCROLL_COMPOSER_GAP_PX = 16;
const SUGGEST_OPTIONS_PROMPT = "I don't know, suggest 5 options";

type PersistedMessage = {
  id: string;
  message: string;
  order: number;
  stage: ConceptProjectStage;
  type: "agent" | "person";
};

type RoadmapItem = {
  description: string | null;
  id: string;
  majorVersion: number;
  minorVersion: number;
  name: string;
};

type ConceptProjectSnapshot = {
  currentStage: ConceptProjectStage;
  description: string | null;
  forWhomSummary: string | null;
  howSummary: string | null;
  id: string;
  name: string | null;
  roadmapId: string | null;
  understoodForWhomAt: string | Date | null;
  understoodHowAt: string | Date | null;
  understoodWhatAt: string | Date | null;
  whatSummary: string | null;
};

type ConceptProjectDiscoveryProps = {
  conceptProjectId: string;
  initialConceptProject: ConceptProjectSnapshot;
  initialMessages: PersistedMessage[];
  initialRoadmap: RoadmapItem[];
  zeroEnabled: boolean;
};

type RenderMessage = {
  id: string;
  isTransient: boolean;
  stage: ConceptProjectStage;
  text: string;
  type: "agent" | "person";
};

function getDisplayName(name: string | null | undefined) {
  return name?.trim() || "Untitled concept project";
}

function getDisplayDescription(description: string | null | undefined) {
  return description?.trim() || "No description yet.";
}

function getStageSummaryLabel(stage: ConceptProjectStage) {
  switch (stage) {
    case "what":
      return "What Summary";
    case "for_whom":
      return "For Whom Summary";
    case "how":
      return "How Summary";
    case "setup":
      return "Setup";
  }
}

function getTextFromUIMessage(message: ConceptProjectAgentUIMessage) {
  return message.parts
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("")
    .trim();
}

function MessageMarkdown({
  isAgent,
  text,
}: {
  isAgent: boolean;
  text: string;
}) {
  const mutedClass = isAgent ? "text-muted-foreground" : "text-background/80";
  const codeClass = isAgent
    ? "rounded bg-background px-1.5 py-0.5 text-foreground"
    : "rounded bg-background/15 px-1.5 py-0.5 text-background";
  const preClass = isAgent
    ? "overflow-x-auto rounded-xl border border-border bg-background px-4 py-3 text-foreground"
    : "overflow-x-auto rounded-xl border border-background/20 bg-background/10 px-4 py-3 text-background";

  return (
    <div className="mt-2 text-sm leading-6">
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

type ConceptProjectDiscoveryViewProps = {
  canSwitchStages: boolean;
  conceptProject: ConceptProjectSnapshot;
  conceptProjectId: string;
  isSwitchingStage: boolean;
  messages: PersistedMessage[];
  onChatFinish?: () => void;
  onStageSelect?: (stage: ConceptProjectStage) => void;
  roadmap: RoadmapItem[];
};

function ConceptProjectDiscoveryView({
  canSwitchStages,
  conceptProject,
  conceptProjectId,
  isSwitchingStage,
  messages,
  onChatFinish,
  onStageSelect,
  roadmap,
}: ConceptProjectDiscoveryViewProps) {
  const searchParams = useSearchParams();
  const [input, setInput] = useState("");
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [composerError, setComposerError] = useState<string | null>(null);
  const clearLocalMessagesTimeoutRef = useRef<number | null>(null);
  const contentShellRef = useRef<HTMLDivElement | null>(null);
  const composerFormRef = useRef<HTMLFormElement | null>(null);
  const composerShellRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isAtBottomRef = useRef(true);
  const didHandleInitialScrollRef = useRef(false);
  const currentStage = conceptProject.currentStage;
  const hasAnsweredOpeningPrompt = messages.some((message) => message.type === "person");
  const openingWordCount = getConceptProjectWordCount(input);
  const maxUnlockedStageIndex = Math.max(
    getConceptProjectStageIndex(currentStage),
    conceptProject.understoodWhatAt ? getConceptProjectStageIndex("for_whom") : -1,
    conceptProject.understoodForWhomAt ? getConceptProjectStageIndex("how") : -1,
    conceptProject.understoodHowAt ? getConceptProjectStageIndex("setup") : -1,
  );

  const {
    clearError,
    error,
    messages: transientMessages,
    sendMessage,
    setMessages,
    status,
  } = useChat<ConceptProjectAgentUIMessage>({
    onFinish: () => {
      if (clearLocalMessagesTimeoutRef.current !== null) {
        window.clearTimeout(clearLocalMessagesTimeoutRef.current);
      }

      clearLocalMessagesTimeoutRef.current = window.setTimeout(() => {
        setMessages([]);
        clearLocalMessagesTimeoutRef.current = null;
      }, 0);

      onChatFinish?.();
    },
    transport: new DefaultChatTransport({
      api: `/api/concept-project/${conceptProjectId}/chat`,
    }),
  });

  useEffect(
    () => () => {
      if (clearLocalMessagesTimeoutRef.current !== null) {
        window.clearTimeout(clearLocalMessagesTimeoutRef.current);
      }
    },
    [],
  );

  const persistedMessageIds = useMemo(
    () => new Set(messages.map((message) => message.id)),
    [messages],
  );

  const renderedMessages = useMemo(() => {
    const persisted: RenderMessage[] = messages.map((message) => ({
      id: message.id,
      isTransient: false,
      stage: message.stage,
      text: message.message,
      type: message.type,
    }));

    const pending = transientMessages
      .filter((message) => {
        if (message.role === "assistant" && status === "ready") {
          return false;
        }

        return !persistedMessageIds.has(message.id);
      })
      .map((message) => ({
        id: message.id,
        isTransient: true,
        stage: currentStage,
        text: getTextFromUIMessage(message),
        type: message.role === "user" ? "person" : "agent",
      }))
      .filter((message) => message.text.length > 0 || message.type === "agent");

    return [...persisted, ...pending];
  }, [currentStage, messages, persistedMessageIds, status, transientMessages]);

  const summaries = [
    {
      key: "what",
      label: getStageSummaryLabel("what"),
      value: conceptProject.whatSummary,
    },
    {
      key: "for_whom",
      label: getStageSummaryLabel("for_whom"),
      value: conceptProject.forWhomSummary,
    },
    {
      key: "how",
      label: getStageSummaryLabel("how"),
      value: conceptProject.howSummary,
    },
  ].filter((summary) => summary.value?.trim());

  const isSetupStage = currentStage === "setup";
  const isSubmitting = status === "submitted" || status === "streaming";
  const latestFinishedAgentMessage = [...renderedMessages]
    .reverse()
    .find((message) => message.type === "agent" && !message.isTransient);

  function getComposerOffset() {
    const composerHeight = composerShellRef.current?.offsetHeight ?? 0;

    return composerHeight + AUTO_SCROLL_COMPOSER_GAP_PX;
  }

  function computeIsAtBottom() {
    const scrollBottom = window.scrollY + window.innerHeight;
    const pageBottom = document.documentElement.scrollHeight;

    return pageBottom - scrollBottom <= AUTO_SCROLL_BOTTOM_THRESHOLD_PX;
  }

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    window.scrollTo({
      behavior,
      top: document.documentElement.scrollHeight,
    });

    isAtBottomRef.current = true;
    setIsAtBottom(true);
  }

  useEffect(() => {
    function syncComposerOffset() {
      const nextOffset = getComposerOffset();

      if (nextOffset > 0 && contentShellRef.current) {
        contentShellRef.current.style.paddingBottom = `${nextOffset}px`;
      }
    }

    syncComposerOffset();
    window.addEventListener("resize", syncComposerOffset);

    return () => {
      window.removeEventListener("resize", syncComposerOffset);
    };
  }, [isAtBottom, isSetupStage]);

  useEffect(() => {
    function handleScroll() {
      const nextIsAtBottom = computeIsAtBottom();

      isAtBottomRef.current = nextIsAtBottom;
      setIsAtBottom(nextIsAtBottom);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (contentShellRef.current) {
      contentShellRef.current.style.paddingBottom = `${getComposerOffset()}px`;
    }

    const nextIsAtBottom = computeIsAtBottom();

    isAtBottomRef.current = nextIsAtBottom;
    setIsAtBottom(nextIsAtBottom);

    if (!isAtBottomRef.current) {
      return;
    }

    scrollToBottom("smooth");
  }, [currentStage, renderedMessages.length]);

  useEffect(() => {
    if (didHandleInitialScrollRef.current) {
      return;
    }

    if (searchParams.get("scroll") !== "latest") {
      didHandleInitialScrollRef.current = true;
      return;
    }

    didHandleInitialScrollRef.current = true;

    window.requestAnimationFrame(() => {
      if (contentShellRef.current) {
        contentShellRef.current.style.paddingBottom = `${getComposerOffset()}px`;
      }

      scrollToBottom("auto");
    });
  }, [searchParams]);

  async function submitUserMessage(nextInput: string) {
    if (!nextInput.trim() || isSubmitting || isSetupStage) {
      return;
    }

    if (!hasAnsweredOpeningPrompt && getConceptProjectWordCount(nextInput) > 128) {
      setComposerError("Keep the first answer within 128 words.");
      return;
    }

    setComposerError(null);
    clearError();
    setInput("");

    await sendMessage({
      id: crypto.randomUUID(),
      parts: [
        {
          text: nextInput,
          type: "text",
        },
      ],
      role: "user",
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await submitUserMessage(input.trim());
  }

  function handleStageSelect(stage: ConceptProjectStage) {
    if (
      !canSwitchStages ||
      isSubmitting ||
      getConceptProjectStageIndex(stage) > maxUnlockedStageIndex
    ) {
      return;
    }

    onStageSelect?.(stage);
  }

  function handleComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!(event.metaKey || event.ctrlKey) || event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    composerFormRef.current?.requestSubmit();
  }

  return (
    <>
      <div className="grid gap-6" ref={contentShellRef}>
        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
          {renderedMessages.map((message) => {
            const isAgent = message.type === "agent";
            const showSuggestOptionsAction =
              !isSetupStage &&
              !isSubmitting &&
              latestFinishedAgentMessage?.id === message.id &&
              isAgent &&
              !message.isTransient;

            return (
              <div
                key={message.id}
                className={isAgent ? "mr-auto max-w-[85%]" : "ml-auto max-w-[85%]"}
              >
                <div
                  className={`rounded-2xl border px-4 py-3 ${
                    isAgent
                      ? "border-border bg-muted/50"
                      : "border-foreground bg-foreground text-background"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
                        isAgent ? "text-muted-foreground" : "text-background/70"
                      }`}
                    >
                      {isAgent ? CONCEPT_PROJECT_STAGE_LABELS[message.stage] : "You"}
                    </span>
                    {message.isTransient ? (
                      <span
                        className={`text-[11px] ${
                          isAgent ? "text-muted-foreground" : "text-background/70"
                        }`}
                      >
                        live
                      </span>
                    ) : null}
                  </div>
                  <MessageMarkdown isAgent={isAgent} text={message.text} />
                </div>
                {showSuggestOptionsAction ? (
                  <div className="mt-1 flex justify-end">
                    <Button
                      className="h-auto px-4 py-3 text-base cursor-pointer"
                      onClick={() => submitUserMessage(SUGGEST_OPTIONS_PROMPT)}
                      type="button"
                    >
                      {SUGGEST_OPTIONS_PROMPT}
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
          <div aria-hidden="true" ref={messagesEndRef} />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20" ref={composerShellRef}>
        <div className="mx-auto w-full max-w-240 px-4 pb-6 sm:px-6">
          <div className="mb-3 flex h-14 justify-center">
            {!isAtBottom ? (
              <Button
                aria-label="Scroll to latest message"
                className="size-11 rounded-full shadow-md"
                onClick={() => scrollToBottom("smooth")}
                size="icon"
                type="button"
              >
                <ArrowDownIcon className="size-5" />
              </Button>
            ) : null}
          </div>
          <div className="rounded-2xl border bg-background/95 px-6 py-5 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/95">
            {isSetupStage ? (
              <div className="rounded-xl border border-dashed px-4 py-4 text-sm text-muted-foreground">
                Setup comes next. The setup agent is not implemented yet.
              </div>
            ) : (
              <form className="space-y-3" onSubmit={handleSubmit} ref={composerFormRef}>
                <div className="flex flex-wrap gap-2">
                  {conceptProjectStages.map((stage, index) => {
                    const isActive = stage === currentStage;
                    const isUnlocked = index <= maxUnlockedStageIndex;

                    return (
                      <button
                        aria-current={isActive ? "step" : undefined}
                        className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                          isActive
                            ? "border-foreground bg-foreground text-background"
                            : isUnlocked
                              ? "border-border bg-background text-foreground hover:border-foreground/40"
                              : "cursor-not-allowed border-border/60 bg-muted/40 text-muted-foreground"
                        }`}
                        disabled={
                          !canSwitchStages || !isUnlocked || isSubmitting || isSwitchingStage
                        }
                        key={stage}
                        onClick={() => handleStageSelect(stage)}
                        type="button"
                      >
                        {CONCEPT_PROJECT_STAGE_LABELS[stage]}
                      </button>
                    );
                  })}
                </div>

                <div className="relative">
                  <textarea
                    className="min-h-32 w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground"
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleComposerKeyDown}
                    placeholder={
                      hasAnsweredOpeningPrompt
                        ? "Answer the current question or add more detail."
                        : "Keep the first answer concise."
                    }
                    value={input}
                  />

                  <Button
                    disabled={!input.trim() || isSubmitting}
                    type="submit"
                    className="absolute right-2 bottom-4"
                  >
                    {isSubmitting ? (
                      "Thinking..."
                    ) : (
                      <>
                        Send
                        <div className="flex">
                          <CommandIcon className="size-2.5" />{" "}
                          <CornerDownLeftIcon className="size-2.5" />
                        </div>
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    {!hasAnsweredOpeningPrompt ? (
                      <p
                        className={`text-xs ${
                          openingWordCount > 128 ? "text-destructive" : "text-muted-foreground"
                        }`}
                      >
                        {openingWordCount}/128 words
                      </p>
                    ) : null}
                    {composerError ? (
                      <p className="text-xs text-destructive">{composerError}</p>
                    ) : error ? (
                      <p className="text-xs text-destructive">{error.message}</p>
                    ) : null}
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function ZeroBackedConceptProjectDiscovery({
  conceptProjectId,
  initialConceptProject,
  initialMessages,
  initialRoadmap,
}: Omit<ConceptProjectDiscoveryProps, "zeroEnabled">) {
  const zero = useZero() as unknown as {
    mutate: {
      conceptProjects: {
        setStage: (args: { currentStage: ConceptProjectStage; id: string }) => void;
      };
    };
  };
  const [isSwitchingStage, startStageTransition] = useTransition();
  const [conceptProjectResult] = useQuery(queries.conceptProjects.byId({ id: conceptProjectId }));
  const [messagesResult] = useQuery(
    queries.conceptProjectChats.messagesByConceptProjectId({ conceptProjectId }),
  );
  const [roadmapResult] = useQuery(queries.roadmaps.itemsByConceptProjectId({ conceptProjectId }));

  const conceptProject = (conceptProjectResult ?? initialConceptProject) as ConceptProjectSnapshot;
  const zeroMessages = messagesResult as PersistedMessage[] | undefined;
  const zeroRoadmap = roadmapResult as RoadmapItem[] | undefined;
  const messages =
    zeroMessages && (zeroMessages.length > 0 || initialMessages.length === 0)
      ? zeroMessages
      : initialMessages;
  const roadmap =
    zeroRoadmap && (zeroRoadmap.length > 0 || initialRoadmap.length === 0)
      ? zeroRoadmap
      : initialRoadmap;

  function handleStageSelect(stage: ConceptProjectStage) {
    startStageTransition(() => {
      zero.mutate.conceptProjects.setStage({
        currentStage: stage,
        id: conceptProjectId,
      });
    });
  }

  return (
    <ConceptProjectDiscoveryView
      canSwitchStages={true}
      conceptProject={conceptProject}
      conceptProjectId={conceptProjectId}
      isSwitchingStage={isSwitchingStage}
      messages={messages}
      onStageSelect={handleStageSelect}
      roadmap={roadmap}
    />
  );
}

function FallbackConceptProjectDiscovery({
  conceptProjectId,
  initialConceptProject,
  initialMessages,
  initialRoadmap,
}: Omit<ConceptProjectDiscoveryProps, "zeroEnabled">) {
  const router = useRouter();

  return (
    <ConceptProjectDiscoveryView
      canSwitchStages={false}
      conceptProject={initialConceptProject}
      conceptProjectId={conceptProjectId}
      isSwitchingStage={false}
      messages={initialMessages}
      onChatFinish={() => {
        router.refresh();
      }}
      roadmap={initialRoadmap}
    />
  );
}

export function ConceptProjectDiscovery(props: ConceptProjectDiscoveryProps) {
  if (!props.zeroEnabled) {
    return (
      <FallbackConceptProjectDiscovery
        conceptProjectId={props.conceptProjectId}
        initialConceptProject={props.initialConceptProject}
        initialMessages={props.initialMessages}
        initialRoadmap={props.initialRoadmap}
      />
    );
  }

  return (
    <ZeroBackedConceptProjectDiscovery
      conceptProjectId={props.conceptProjectId}
      initialConceptProject={props.initialConceptProject}
      initialMessages={props.initialMessages}
      initialRoadmap={props.initialRoadmap}
    />
  );
}
