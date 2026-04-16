import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vite-plus/test";

vi.mock("@/components/chat/chat-composer", () => ({
  ChatComposer: ({
    header,
    helperContent,
    inputLabel,
  }: {
    header?: React.ReactNode;
    helperContent?: React.ReactNode;
    inputLabel: string;
  }) => (
    <div>
      <div>{inputLabel}</div>
      {header}
      {helperContent}
    </div>
  ),
}));

vi.mock("@/components/chat/chat-messages", () => ({
  ChatMessages: ({
    messages,
    renderAssistantLabel,
    renderMessageActions,
  }: {
    messages: Array<{
      content: string;
      id: string;
      isTransient: boolean;
      meta?: {
        stage: "what" | "for_whom" | "how" | "setup" | "grill_me";
      };
      role: "assistant" | "user";
    }>;
    renderAssistantLabel?: (message: {
      content: string;
      id: string;
      isTransient: boolean;
      meta?: {
        stage: "what" | "for_whom" | "how" | "setup" | "grill_me";
      };
      role: "assistant" | "user";
    }) => React.ReactNode;
    renderMessageActions?: (message: {
      content: string;
      id: string;
      isTransient: boolean;
      meta?: {
        stage: "what" | "for_whom" | "how" | "setup" | "grill_me";
      };
      role: "assistant" | "user";
    }) => React.ReactNode;
  }) => (
    <div>
      {messages.map((message) => (
        <div key={message.id}>
          {message.role === "assistant" ? renderAssistantLabel?.(message) : null}
          {renderMessageActions?.(message)}
        </div>
      ))}
    </div>
  ),
}));

vi.mock("@/components/concept-project/concept-project-post-setup-actions", () => ({
  ConceptProjectPostSetupActions: () => <div>Post setup actions</div>,
}));

vi.mock("@/lib/concept-project/shared", () => ({
  CONCEPT_PROJECT_STAGE_LABELS: {
    for_whom: "For Whom",
    grill_me: "Grill Me",
    how: "How",
    setup: "Setup",
    what: "What",
  },
  conceptProjectStages: ["what", "for_whom", "how", "setup", "grill_me"],
}));

vi.mock("@/components/concept-project/concept-project-discovery-shared", () => ({
  isStageComplete: (
    conceptProject: {
      understoodForWhomAt: string | Date | null;
      understoodHowAt: string | Date | null;
      understoodSetupAt: string | Date | null;
      understoodWhatAt: string | Date | null;
    },
    stage: "what" | "for_whom" | "how" | "setup" | "grill_me",
  ) => {
    switch (stage) {
      case "what":
        return Boolean(conceptProject.understoodWhatAt);
      case "for_whom":
        return Boolean(conceptProject.understoodForWhomAt);
      case "how":
        return Boolean(conceptProject.understoodHowAt);
      case "setup":
        return Boolean(conceptProject.understoodSetupAt);
      case "grill_me":
        return false;
    }
  },
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuShortcut: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { ConceptProjectDiscoveryComposer } from "../components/concept-project/concept-project-discovery-composer";
import { ConceptProjectDiscoveryMessages } from "../components/concept-project/concept-project-discovery-messages";

describe("concept project chat components", () => {
  it("renders the composer through the shared chat composer", () => {
    const markup = renderToStaticMarkup(
      <ConceptProjectDiscoveryComposer
        canSwitchStages
        composerError="Composer failed"
        composerFormRef={{ current: null }}
        composerShellRef={{ current: null }}
        conceptProject={{
          chatId: "chat-1",
          currentStage: "what",
          description: null,
          forWhomSummary: null,
          howSummary: null,
          id: "concept-1",
          name: "Concept",
          roadmapId: "roadmap-1",
          setupSummary: null,
          understoodForWhomAt: null,
          understoodHowAt: null,
          understoodSetupAt: "2026-04-16T10:00:00.000Z",
          understoodWhatAt: "2026-04-16T09:00:00.000Z",
          whatSummary: null,
        }}
        conceptProjectId="concept-1"
        currentStage="what"
        errorMessage={undefined}
        handleComposerKeyDown={() => {}}
        handleStageSelect={() => {}}
        handleSubmit={() => {}}
        hasAnsweredOpeningPrompt={false}
        input=""
        isAtBottom
        isSubmitting={false}
        isSwitchingStage={false}
        maxUnlockedStageIndex={1}
        onInputChange={() => {}}
        onScrollToBottom={() => {}}
        openingWordCount={23}
        projectId="project-1"
        showGraduateAction
      />,
    );

    expect(markup).toContain("Describe your concept project");
    expect(markup).toContain("What");
    expect(markup).toContain("23/128 words");
    expect(markup).toContain("Composer failed");
    expect(markup).toContain("Post setup actions");
  });

  it("renders concept-project message actions through the shared messages component", () => {
    const markup = renderToStaticMarkup(
      <ConceptProjectDiscoveryMessages
        canProgressToNextStage
        contentClassName="pt-44"
        hasRoadmap
        isArchived={false}
        isSubmitting={false}
        latestFinishedAgentMessageId="assistant-1"
        latestUserMessageId="user-1"
        messages={[
          {
            content: "Assistant reply",
            id: "assistant-1",
            isTransient: false,
            meta: {
              stage: "what",
            },
            role: "assistant",
          },
          {
            content: "User reply",
            id: "user-1",
            isTransient: false,
            meta: {
              stage: "what",
            },
            role: "user",
          },
        ]}
        messagesEndRef={{ current: null }}
        nextStage="for_whom"
        onProgressToNextStage={() => {}}
        onSuggestOptions={() => {}}
        progressCard={{
          body: "Body",
          buttonLabel: "Continue",
          title: "What Agent",
        }}
      />,
    );

    expect(markup).toContain("What agent:");
    expect(markup).toContain("suggest 5 options");
    expect(markup).toContain("What Agent:");
    expect(markup).toContain("Continue");
  });
});
