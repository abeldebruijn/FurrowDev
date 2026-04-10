"use client";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { ConceptProjectGraduate } from "@/components/concept-project/concept-project-graduate";
import { ConceptProjectRoadmapRail } from "@/components/concept-project/concept-project-roadmap-rail";
import type { ConceptProjectAgentUIMessage } from "@/lib/agents/concept-project";
import type {
  ConceptProjectRoadmapCurrentVersion,
  ConceptProjectRoadmapVisualItem,
} from "@/lib/concept-project/roadmap";
import {
  CONCEPT_PROJECT_STAGE_LABELS,
  conceptProjectStages,
  getNextConceptProjectStage,
  getConceptProjectStageIndex,
  getConceptProjectWordCount,
  type ConceptProjectStage,
} from "@/lib/concept-project/shared";
import { cn } from "@/lib/utils";
import { mutators } from "@/zero/mutators";
import { queries } from "@/zero/queries";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ArrowDownIcon, CheckIcon, CommandIcon, CornerDownLeftIcon } from "lucide-react";

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

type RoadmapItem = ConceptProjectRoadmapVisualItem;

type ConceptProjectSnapshot = {
  chatId: string;
  currentStage: ConceptProjectStage;
  description: string | null;
  forWhomSummary: string | null;
  howSummary: string | null;
  id: string;
  name: string | null;
  roadmapId: string | null;
  understoodForWhomAt: string | Date | null;
  understoodHowAt: string | Date | null;
  understoodSetupAt: string | Date | null;
  understoodWhatAt: string | Date | null;
  setupSummary: string | null;
  whatSummary: string | null;
};

type ConceptProjectDiscoveryProps = {
  conceptProjectId: string;
  initialConceptProject: ConceptProjectSnapshot;
  isArchived?: boolean;
  initialMessages: PersistedMessage[];
  initialRoadmapCurrentVersion: ConceptProjectRoadmapCurrentVersion;
  initialRoadmap: RoadmapItem[];
  projectId?: string | null;
  zeroEnabled: boolean;
};

type RenderMessage = {
  id: string;
  isTransient: boolean;
  stage: ConceptProjectStage;
  text: string;
  type: "agent" | "person";
};

function getStageProgressCard(stage: Exclude<ConceptProjectStage, "setup">) {
  switch (stage) {
    case "what":
      return {
        body: "I understand what you want to create. You can keep refining the concept, or continue into who this is for.",
        buttonLabel: "Continue to for whom",
        title: "What Agent",
      };
    case "for_whom":
      return {
        body: "I understand who this project is for and how broad the audience should be. You can keep refining the audience, or continue into how it should work.",
        buttonLabel: "Continue to how",
        title: "For Whom Agent",
      };
    case "how":
      return {
        body: "I understand the technical shape and product constraints. You can keep refining the implementation direction, or continue into setup.",
        buttonLabel: "Continue to setup",
        title: "How Agent",
      };
  }
}

function isStageComplete(conceptProject: ConceptProjectSnapshot, stage: ConceptProjectStage) {
  switch (stage) {
    case "what":
      return Boolean(conceptProject.understoodWhatAt);
    case "for_whom":
      return Boolean(conceptProject.understoodForWhomAt);
    case "how":
      return Boolean(conceptProject.understoodHowAt);
    case "setup":
      return Boolean(conceptProject.understoodSetupAt);
  }
}

function getTextFromUIMessage(message: ConceptProjectAgentUIMessage) {
  return message.parts
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("")
    .trim();
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
          hr: ({ node: _node, ...props }) => <hr {...props} className="my-4" />,
        }}
      >
        {text || "..."}
      </ReactMarkdown>
    </div>
  );
}

type ConceptProjectDiscoveryViewProps = {
  canEditRoadmapVersions: boolean;
  canInsertRoadmapVersions: boolean;
  canSwitchStages: boolean;
  conceptProject: ConceptProjectSnapshot;
  conceptProjectId: string;
  isArchived?: boolean;
  isSwitchingStage: boolean;
  messages: PersistedMessage[];
  onDeleteRoadmapNode?: (nodeId: string) => Promise<void>;
  onChatFinish?: () => void;
  onInsertRoadmapVersion?: (args: {
    description?: string;
    majorVersion: number;
    minorVersion: number;
    name: string;
  }) => Promise<void>;
  onUpdateRoadmapVersionNodes?: (
    drafts: Array<{
      description?: string;
      id: string;
      name: string;
    }>,
  ) => Promise<void>;
  onStageSelect?: (stage: ConceptProjectStage, options?: { appendIntroMessage?: boolean }) => void;
  projectId?: string | null;
  roadmapCurrentVersion: ConceptProjectRoadmapCurrentVersion;
  roadmap: RoadmapItem[];
};

function ConceptProjectDiscoveryView({
  canEditRoadmapVersions,
  canInsertRoadmapVersions,
  canSwitchStages,
  conceptProject,
  conceptProjectId,
  isArchived = false,
  isSwitchingStage,
  messages,
  onDeleteRoadmapNode,
  onChatFinish,
  onInsertRoadmapVersion,
  onUpdateRoadmapVersionNodes,
  onStageSelect,
  projectId,
  roadmapCurrentVersion,
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

  const isSetupStage = currentStage === "setup";
  const isSubmitting = !isArchived && (status === "submitted" || status === "streaming");
  const latestFinishedAgentMessage = [...renderedMessages]
    .reverse()
    .find((message) => message.type === "agent" && !message.isTransient);
  const latestUserMessage = [...renderedMessages]
    .reverse()
    .find((message) => message.type === "person");
  const canProgressToNextStage =
    currentStage !== "setup" &&
    ((currentStage === "what" && Boolean(conceptProject.understoodWhatAt)) ||
      (currentStage === "for_whom" && Boolean(conceptProject.understoodForWhomAt)) ||
      (currentStage === "how" && Boolean(conceptProject.understoodHowAt)));
  const nextStage = currentStage === "setup" ? null : getNextConceptProjectStage(currentStage);
  const progressCard = canProgressToNextStage ? getStageProgressCard(currentStage) : null;
  const hasRoadmap = roadmap.length > 0;
  const showGraduateAction = currentStage === "setup" && Boolean(conceptProject.understoodSetupAt);

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
    if (!nextInput.trim() || isSubmitting || isArchived) {
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

  function handleStageSelect(
    stage: ConceptProjectStage,
    options?: { appendIntroMessage?: boolean },
  ) {
    if (
      !canSwitchStages ||
      isSubmitting ||
      getConceptProjectStageIndex(stage) > maxUnlockedStageIndex
    ) {
      return;
    }

    onStageSelect?.(stage, options);
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
        <ConceptProjectRoadmapRail
          canEditVersions={canEditRoadmapVersions}
          canInsertVersions={canInsertRoadmapVersions}
          currentVersion={roadmapCurrentVersion}
          onDeleteRoadmapNode={onDeleteRoadmapNode}
          onInsertVersion={onInsertRoadmapVersion}
          onUpdateRoadmapVersionNodes={onUpdateRoadmapVersionNodes}
          roadmap={roadmap}
        />

        <div
          className={cn(
            "flex-1 space-y-3 overflow-y-auto px-6 py-5",
            hasRoadmap && "pt-44 sm:pt-48",
          )}
        >
          {renderedMessages.map((message) => {
            const isAgent = message.type === "agent";
            const showSuggestOptionsAction =
              !isSubmitting &&
              latestFinishedAgentMessage?.id === message.id &&
              isAgent &&
              !message.isTransient;
            const showProgressAction =
              canProgressToNextStage &&
              nextStage !== null &&
              !isSubmitting &&
              latestUserMessage?.id === message.id &&
              !isAgent;

            return (
              <div key={message.id} className="space-y-3">
                <div className={isAgent ? "mr-auto max-w-[85%]" : "ml-auto max-w-[60ch]"}>
                  <div
                    className={`rounded-2xl border px-4 py-3 ${
                      isAgent
                        ? "border-border bg-muted/50"
                        : "border-foreground bg-accent text-accent-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isAgent ? (
                        <span
                          className={`text-xs font-semibold font-mono text-mutedtext-muted-foreground`}
                        >
                          {`${CONCEPT_PROJECT_STAGE_LABELS[message.stage]} agent:`}
                        </span>
                      ) : null}
                      {message.isTransient ? (
                        <span
                          className={`text-[10px] ${
                            isAgent ? "text-muted-foreground" : "text-background/70"
                          }`}
                        >
                          live
                        </span>
                      ) : null}
                    </div>
                    <MessageMarkdown isAgent={isAgent} text={message.text} />
                  </div>
                </div>
                {showSuggestOptionsAction && !isArchived ? (
                  <div className="flex justify-end">
                    <Button
                      className="cursor-pointer"
                      onClick={() =>
                        submitUserMessage(
                          SUGGEST_OPTIONS_PROMPT +
                            ". For each option give a concise description, pros and cons.",
                        )
                      }
                      type="button"
                    >
                      {SUGGEST_OPTIONS_PROMPT}
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
                      <Button
                        className="cursor-pointer"
                        onClick={() =>
                          handleStageSelect(nextStage, {
                            appendIntroMessage: true,
                          })
                        }
                        type="button"
                      >
                        {progressCard.buttonLabel}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
          <div aria-hidden="true" ref={messagesEndRef} />
        </div>
      </div>

      {isArchived && projectId ? (
        <Alert>
          <AlertTitle>Concept archived</AlertTitle>
          <AlertDescription>
            This concept project has graduated into a real project. Discovery stays here as a
            read-only record.
          </AlertDescription>
          <div className="mt-4">
            <Link href={`/project/${projectId}`}>
              <Button type="button">Open Project</Button>
            </Link>
          </div>
        </Alert>
      ) : null}

      {!isArchived ? (
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
              <form className="space-y-3" onSubmit={handleSubmit} ref={composerFormRef}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {conceptProjectStages.map((stage, index) => {
                      const isActive = stage === currentStage;
                      const isCompleted = isStageComplete(conceptProject, stage);
                      const isUnlocked = index <= maxUnlockedStageIndex;

                      return (
                        <button
                          aria-current={isActive ? "step" : undefined}
                          className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                            isActive
                              ? "border-foreground bg-foreground text-background"
                              : isCompleted
                                ? "border-emerald-600 bg-background text-foreground hover:border-emerald-500"
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
                          <span className="inline-flex items-center gap-1.5">
                            {isCompleted ? <CheckIcon className="size-3.5" /> : null}
                            {CONCEPT_PROJECT_STAGE_LABELS[stage]}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {showGraduateAction ? (
                    <div className="shrink-0">
                      <ConceptProjectGraduate
                        conceptProjectId={conceptProjectId}
                        projectId={projectId ?? null}
                      />
                    </div>
                  ) : null}
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
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ZeroBackedConceptProjectDiscovery({
  conceptProjectId,
  initialConceptProject,
  isArchived,
  initialMessages,
  initialRoadmapCurrentVersion,
  initialRoadmap,
  projectId,
}: Omit<ConceptProjectDiscoveryProps, "zeroEnabled">) {
  const zero = useZero() as any;
  const router = useRouter();
  const [isSwitchingStage, startStageTransition] = useTransition();
  const [conceptProjectResult] = useQuery(queries.conceptProjects.byId({ id: conceptProjectId }));
  const [messagesResult] = useQuery(
    queries.conceptProjectChats.messagesByConceptProjectId({ conceptProjectId }),
  );
  const [roadmapStateResult] = useQuery(queries.roadmaps.byConceptProjectId({ conceptProjectId }));
  const [roadmapResult] = useQuery(queries.roadmaps.itemsByConceptProjectId({ conceptProjectId }));

  const conceptProject = (conceptProjectResult ?? initialConceptProject) as ConceptProjectSnapshot;
  const zeroMessages = messagesResult as PersistedMessage[] | undefined;
  const zeroRoadmapState = roadmapStateResult as
    | { currentMajor: number; currentMinor: number }
    | null
    | undefined;
  const zeroRoadmap = roadmapResult as RoadmapItem[] | undefined;
  const messages =
    zeroMessages && (zeroMessages.length > 0 || initialMessages.length === 0)
      ? zeroMessages
      : initialMessages;
  const roadmapCurrentVersion = zeroRoadmapState ?? initialRoadmapCurrentVersion;
  const roadmap =
    zeroRoadmap && (zeroRoadmap.length > 0 || initialRoadmap.length === 0)
      ? zeroRoadmap
      : initialRoadmap;

  function handleStageSelect(
    stage: ConceptProjectStage,
    options?: { appendIntroMessage?: boolean },
  ) {
    startStageTransition(() => {
      void fetch(`/api/concept-project/${conceptProjectId}/settings`, {
        body: JSON.stringify({
          appendIntroMessage: options?.appendIntroMessage,
          currentStage: stage,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "PATCH",
      }).then(() => {
        router.refresh();
      });
    });
  }

  async function handleInsertRoadmapVersion(args: {
    description?: string;
    majorVersion: number;
    minorVersion: number;
    name: string;
  }) {
    if (!conceptProject.roadmapId) {
      throw new Error("Roadmap not found.");
    }

    await zero.mutate(
      mutators.roadmapItems.insertVersionAt({
        conceptProjectId,
        description: args.description,
        id: crypto.randomUUID(),
        majorVersion: args.majorVersion,
        minorVersion: args.minorVersion,
        name: args.name,
        roadmapId: conceptProject.roadmapId,
      }),
    ).client;

    router.refresh();
  }

  async function handleUpdateRoadmapVersionNodes(
    drafts: Array<{
      description?: string;
      id: string;
      name: string;
    }>,
  ) {
    await Promise.all(
      drafts.map(
        (draft) =>
          zero.mutate(
            mutators.roadmapItems.update({
              conceptProjectId,
              description: draft.description,
              id: draft.id,
              name: draft.name,
            }),
          ).client,
      ),
    );

    router.refresh();
  }

  async function handleDeleteRoadmapNode(nodeId: string) {
    if (!conceptProject.roadmapId) {
      throw new Error("Roadmap not found.");
    }

    await zero.mutate(
      mutators.roadmapItems.deleteAndRepairVersion({
        conceptProjectId,
        id: nodeId,
        roadmapId: conceptProject.roadmapId,
      }),
    ).client;

    router.refresh();
  }

  return (
    <ConceptProjectDiscoveryView
      canEditRoadmapVersions={Boolean(
        !isArchived && conceptProject.roadmapId && conceptProject.understoodSetupAt,
      )}
      canInsertRoadmapVersions={Boolean(
        !isArchived && conceptProject.roadmapId && conceptProject.understoodSetupAt,
      )}
      canSwitchStages={!isArchived}
      conceptProject={conceptProject}
      conceptProjectId={conceptProjectId}
      isArchived={isArchived}
      isSwitchingStage={isSwitchingStage}
      messages={messages}
      onDeleteRoadmapNode={handleDeleteRoadmapNode}
      onStageSelect={handleStageSelect}
      onInsertRoadmapVersion={handleInsertRoadmapVersion}
      onUpdateRoadmapVersionNodes={handleUpdateRoadmapVersionNodes}
      projectId={projectId}
      roadmapCurrentVersion={roadmapCurrentVersion}
      roadmap={roadmap}
    />
  );
}

function FallbackConceptProjectDiscovery({
  conceptProjectId,
  initialConceptProject,
  isArchived,
  initialMessages,
  initialRoadmapCurrentVersion,
  initialRoadmap,
  projectId,
}: Omit<ConceptProjectDiscoveryProps, "zeroEnabled">) {
  const router = useRouter();

  async function handleInsertRoadmapVersion(args: {
    description?: string;
    majorVersion: number;
    minorVersion: number;
    name: string;
  }) {
    const response = await fetch(`/api/concept-project/${conceptProjectId}/settings`, {
      body: JSON.stringify(args),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;

      throw new Error(errorBody?.error || "Failed to insert roadmap node.");
    }

    router.refresh();
  }

  async function handleUpdateRoadmapVersionNodes(
    drafts: Array<{
      description?: string;
      id: string;
      name: string;
    }>,
  ) {
    await Promise.all(
      drafts.map(async (draft) => {
        const response = await fetch(`/api/concept-project/${conceptProjectId}/settings`, {
          body: JSON.stringify({
            description: draft.description,
            nodeId: draft.id,
            nodeName: draft.name,
          }),
          headers: {
            "content-type": "application/json",
          },
          method: "PATCH",
        });

        if (!response.ok) {
          const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;

          throw new Error(errorBody?.error || "Failed to update roadmap node.");
        }
      }),
    );

    router.refresh();
  }

  async function handleDeleteRoadmapNode(nodeId: string) {
    const response = await fetch(`/api/concept-project/${conceptProjectId}/settings`, {
      body: JSON.stringify({
        nodeId,
      }),
      headers: {
        "content-type": "application/json",
      },
      method: "DELETE",
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;

      throw new Error(errorBody?.error || "Failed to delete roadmap node.");
    }

    router.refresh();
  }

  return (
    <ConceptProjectDiscoveryView
      canEditRoadmapVersions={Boolean(
        !isArchived && initialConceptProject.roadmapId && initialConceptProject.understoodSetupAt,
      )}
      canInsertRoadmapVersions={Boolean(
        !isArchived && initialConceptProject.roadmapId && initialConceptProject.understoodSetupAt,
      )}
      canSwitchStages={!isArchived}
      conceptProject={initialConceptProject}
      conceptProjectId={conceptProjectId}
      isArchived={isArchived}
      isSwitchingStage={false}
      messages={initialMessages}
      onDeleteRoadmapNode={handleDeleteRoadmapNode}
      onChatFinish={() => {
        router.refresh();
      }}
      onStageSelect={async (stage, options) => {
        await fetch(`/api/concept-project/${conceptProjectId}/settings`, {
          body: JSON.stringify({
            appendIntroMessage: options?.appendIntroMessage,
            currentStage: stage,
          }),
          headers: {
            "content-type": "application/json",
          },
          method: "PATCH",
        });

        router.refresh();
      }}
      onInsertRoadmapVersion={handleInsertRoadmapVersion}
      onUpdateRoadmapVersionNodes={handleUpdateRoadmapVersionNodes}
      projectId={projectId}
      roadmapCurrentVersion={initialRoadmapCurrentVersion}
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
        isArchived={props.isArchived}
        initialMessages={props.initialMessages}
        initialRoadmapCurrentVersion={props.initialRoadmapCurrentVersion}
        initialRoadmap={props.initialRoadmap}
        projectId={props.projectId}
      />
    );
  }

  return (
    <ZeroBackedConceptProjectDiscovery
      conceptProjectId={props.conceptProjectId}
      initialConceptProject={props.initialConceptProject}
      isArchived={props.isArchived}
      initialMessages={props.initialMessages}
      initialRoadmapCurrentVersion={props.initialRoadmapCurrentVersion}
      initialRoadmap={props.initialRoadmap}
      projectId={props.projectId}
    />
  );
}
