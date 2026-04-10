"use client";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { ConceptProjectDiscoveryComposer } from "@/components/concept-project/concept-project-discovery-composer";
import { ConceptProjectDiscoveryMessages } from "@/components/concept-project/concept-project-discovery-messages";
import { ConceptProjectRoadmapRail } from "@/components/concept-project/concept-project-roadmap-rail";
import {
  buildRenderedMessages,
  type ConceptProjectDiscoveryProps,
  type ConceptProjectSnapshot,
  getMaxUnlockedStageIndex,
  getStageProgressCard,
  type PersistedMessage,
  type RoadmapItem,
  type RoadmapNodeDraft,
  type RoadmapVersionInsertArgs,
} from "@/components/concept-project/concept-project-discovery-shared";
import type { ConceptProjectAgentUIMessage } from "@/lib/agents/concept-project";
import {
  CONCEPT_PROJECT_STAGE_LABELS,
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

const AUTO_SCROLL_BOTTOM_THRESHOLD_PX = 24;
const AUTO_SCROLL_COMPOSER_GAP_PX = 16;
const SUGGEST_OPTIONS_PROMPT = "I don't know, suggest 5 options";

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
      case "grill_me":
        return "stress-testing setup assumptions";
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
    case "grill_me":
      return "probing gaps and sharpening setup decisions";
  }
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
  const transientToastId = `concept-project-transient-agent-${conceptProjectId}`;
  const hasAnsweredOpeningPrompt = messages.some((message) => message.type === "person");
  const openingWordCount = getConceptProjectWordCount(input);
  const maxUnlockedStageIndex = getMaxUnlockedStageIndex(conceptProject);

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

  const renderedMessages = useMemo(
    () =>
      buildRenderedMessages({
        currentStage,
        messages,
        persistedMessageIds,
        status,
        transientMessages,
      }),
    [currentStage, messages, persistedMessageIds, status, transientMessages],
  );
  const latestTransientAgentMessage = useMemo(
    () =>
      [...renderedMessages]
        .reverse()
        .find((message) => message.type === "agent" && message.isTransient),
    [renderedMessages],
  );
  const transientAgentActivity = getTransientAgentActivity(
    currentStage,
    Boolean(latestTransientAgentMessage?.text.length),
  );

  const isSetupStage = currentStage === "setup" || currentStage === "grill_me";
  const isSubmitting = !isArchived && (status === "submitted" || status === "streaming");
  const latestFinishedAgentMessage = [...renderedMessages]
    .reverse()
    .find((message) => message.type === "agent" && !message.isTransient);
  const latestUserMessage = [...renderedMessages]
    .reverse()
    .find((message) => message.type === "person");
  const canProgressToNextStage =
    currentStage !== "setup" &&
    currentStage !== "grill_me" &&
    ((currentStage === "what" && Boolean(conceptProject.understoodWhatAt)) ||
      (currentStage === "for_whom" && Boolean(conceptProject.understoodForWhomAt)) ||
      (currentStage === "how" && Boolean(conceptProject.understoodHowAt)));
  const nextStage =
    currentStage === "setup" || currentStage === "grill_me"
      ? null
      : getNextConceptProjectStage(currentStage);
  const progressCard = canProgressToNextStage ? getStageProgressCard(currentStage) : null;
  const hasRoadmap = roadmap.length > 0;
  const showGraduateAction = Boolean(conceptProject.understoodSetupAt);

  useEffect(() => {
    if (!isSubmitting) {
      toast.dismiss(transientToastId);
      return;
    }

    toast.loading(`${CONCEPT_PROJECT_STAGE_LABELS[currentStage]} agent`, {
      description: transientAgentActivity,
      duration: Number.POSITIVE_INFINITY,
      id: transientToastId,
      position: "top-center",
    });
  }, [currentStage, isSubmitting, transientAgentActivity, transientToastId]);

  useEffect(
    () => () => {
      toast.dismiss(transientToastId);
    },
    [transientToastId],
  );

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
          currentVersion={null}
          onDeleteRoadmapNode={onDeleteRoadmapNode}
          onInsertVersion={onInsertRoadmapVersion}
          onUpdateRoadmapVersionNodes={onUpdateRoadmapVersionNodes}
          roadmap={roadmap}
        />

        <ConceptProjectDiscoveryMessages
          canProgressToNextStage={canProgressToNextStage}
          contentClassName={cn(hasRoadmap && "pt-44 sm:pt-48")}
          hasRoadmap={hasRoadmap}
          isArchived={isArchived}
          isSubmitting={isSubmitting}
          latestFinishedAgentMessageId={latestFinishedAgentMessage?.id}
          latestUserMessageId={latestUserMessage?.id}
          messages={renderedMessages}
          nextStage={nextStage}
          onProgressToNextStage={() =>
            nextStage
              ? handleStageSelect(nextStage, {
                  appendIntroMessage: true,
                })
              : undefined
          }
          onSuggestOptions={() =>
            submitUserMessage(
              SUGGEST_OPTIONS_PROMPT +
                ". For each option give a concise description, pros and cons.",
            )
          }
          progressCard={progressCard}
        />
        <div aria-hidden="true" ref={messagesEndRef} />
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
        <ConceptProjectDiscoveryComposer
          canSwitchStages={canSwitchStages}
          composerError={composerError}
          composerFormRef={composerFormRef}
          composerShellRef={composerShellRef}
          conceptProject={conceptProject}
          conceptProjectId={conceptProjectId}
          currentStage={currentStage}
          errorMessage={error?.message}
          handleComposerKeyDown={handleComposerKeyDown}
          handleStageSelect={(stage) => handleStageSelect(stage)}
          handleSubmit={handleSubmit}
          hasAnsweredOpeningPrompt={hasAnsweredOpeningPrompt}
          input={input}
          isAtBottom={isAtBottom}
          isSubmitting={isSubmitting}
          isSwitchingStage={isSwitchingStage}
          maxUnlockedStageIndex={maxUnlockedStageIndex}
          onInputChange={setInput}
          onScrollToBottom={() => scrollToBottom("smooth")}
          openingWordCount={openingWordCount}
          projectId={projectId}
          showGraduateAction={showGraduateAction}
        />
      ) : null}
    </>
  );
}

function ZeroBackedConceptProjectDiscovery({
  conceptProjectId,
  initialConceptProject,
  isArchived,
  initialMessages,
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

  async function handleInsertRoadmapVersion(args: RoadmapVersionInsertArgs) {
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

  async function handleUpdateRoadmapVersionNodes(drafts: RoadmapNodeDraft[]) {
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
      roadmap={roadmap}
    />
  );
}

function FallbackConceptProjectDiscovery({
  conceptProjectId,
  initialConceptProject,
  isArchived,
  initialMessages,
  initialRoadmap,
  projectId,
}: Omit<ConceptProjectDiscoveryProps, "zeroEnabled">) {
  const router = useRouter();

  async function handleInsertRoadmapVersion(args: RoadmapVersionInsertArgs) {
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

  async function handleUpdateRoadmapVersionNodes(drafts: RoadmapNodeDraft[]) {
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
