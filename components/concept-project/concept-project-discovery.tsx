"use client";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { ConceptProjectAgentUIMessage } from "@/lib/agents/concept-project";
import {
  CONCEPT_PROJECT_STAGE_LABELS,
  conceptProjectStages,
  getConceptProjectStageDescription,
  getConceptProjectStageIndex,
  getConceptProjectWordCount,
  type ConceptProjectStage,
} from "@/lib/concept-project/shared";
import { queries } from "@/zero/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
  const [input, setInput] = useState("");
  const [composerError, setComposerError] = useState<string | null>(null);
  const clearLocalMessagesTimeoutRef = useRef<number | null>(null);
  const composerFormRef = useRef<HTMLFormElement | null>(null);
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextInput = input.trim();

    if (!nextInput || isSubmitting || isSetupStage) {
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
    <div className="grid gap-6">
      <Card className="shadow-none">
        <CardHeader className="border-b">
          <CardTitle>{CONCEPT_PROJECT_STAGE_LABELS[currentStage]} Agent</CardTitle>
          <CardDescription>{getConceptProjectStageDescription(currentStage)}</CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-[620px] flex-col gap-4 p-0">
          <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
            {renderedMessages.map((message) => {
              const isAgent = message.type === "agent";

              return (
                <div
                  key={message.id}
                  className={`max-w-[85%] rounded-2xl border px-4 py-3 ${
                    isAgent
                      ? "mr-auto border-border bg-muted/50"
                      : "ml-auto border-foreground bg-foreground text-background"
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
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                    {message.text || "..."}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="border-t px-6 py-5">
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
                        disabled={!canSwitchStages || !isUnlocked || isSubmitting || isSwitchingStage}
                        key={stage}
                        onClick={() => handleStageSelect(stage)}
                        type="button"
                      >
                        {CONCEPT_PROJECT_STAGE_LABELS[stage]}
                      </button>
                    );
                  })}
                </div>
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
                  <Button disabled={!input.trim() || isSubmitting} type="submit">
                    {isSubmitting ? "Thinking..." : "Send"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
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
