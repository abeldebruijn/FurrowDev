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
    renderAssistantLabel,
    renderStreamingState,
  }: {
    renderAssistantLabel?: (message: {
      content: string;
      id: string;
      isTransient: boolean;
      role: "assistant" | "user";
    }) => React.ReactNode;
    renderStreamingState?: React.ReactNode;
  }) => (
    <div>
      {renderAssistantLabel?.({
        content: "hello",
        id: "assistant-1",
        isTransient: false,
        role: "assistant",
      })}
      {renderStreamingState}
    </div>
  ),
}));

vi.mock("@/components/ui/sidebar", () => ({
  SidebarProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useSidebar: () => ({
    isMobile: false,
    open: false,
  }),
}));

vi.mock("../components/ui/button-group", () => ({
  ButtonGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("../components/vision/vision-settings-dialog", () => ({
  VisionSettingsDialog: () => <div>Settings dialog</div>,
}));

vi.mock("../components/vision/create-idea-dialog", () => ({
  CreateIdeaDialog: () => <div>Create idea</div>,
}));

vi.mock("../components/vision/vision-collaborators-dialog", () => ({
  VisionCollaboratorsDialog: () => <div>Collaborators dialog</div>,
}));

vi.mock("../components/vision/vision-summary-sidebar", () => ({
  VisionSummarySidebar: () => <div>Summary sidebar</div>,
  VisionSummarySidebarTrigger: () => <div>Summary trigger</div>,
}));

import { VisionWorkspaceView } from "../components/vision/vision-workspace-view";

describe("VisionWorkspaceView", () => {
  it("composes shared chat primitives with vision-specific controls", () => {
    const markup = renderToStaticMarkup(
      <VisionWorkspaceView
        canConvertToIdea
        canManageCollaborators
        collaborators={[]}
        composerFormRef={{ current: null }}
        composerShellRef={{ current: null }}
        contentShellRef={{ current: null }}
        currentTitle="Vision title"
        eligibleCollaborators={[]}
        input=""
        isAtBottom
        isSubmitting={false}
        messages={[]}
        messagesEndRef={{ current: null }}
        onAddCollaborator={async () => {}}
        onComposerKeyDown={() => {}}
        onInputChange={() => {}}
        onRemoveCollaborator={async () => {}}
        onSubmit={() => {}}
        onTitleChange={() => {}}
        ownerName="Abel"
        ownerUserId="user-1"
        projectId="project-1"
        roadmapItems={[]}
        routeError="Route failed"
        scrollToBottom={() => {}}
        sendError={undefined}
        summary="## Current understanding"
        visionId="vision-1"
      />,
    );

    expect(markup).toContain("Message the vision agent");
    expect(markup).toContain("Vision title");
    expect(markup).toContain("Settings dialog");
    expect(markup).toContain("Create idea");
    expect(markup).toContain("Summary trigger");
    expect(markup).toContain("Summary sidebar");
    expect(markup).toContain("Collaborators dialog");
    expect(markup).toContain("Vision agent:");
    expect(markup).toContain("Route failed");
  });

  it("does not render a vision-specific thinking state while submitting", () => {
    const markup = renderToStaticMarkup(
      <VisionWorkspaceView
        canConvertToIdea
        canManageCollaborators
        collaborators={[]}
        composerFormRef={{ current: null }}
        composerShellRef={{ current: null }}
        contentShellRef={{ current: null }}
        currentTitle="Vision title"
        eligibleCollaborators={[]}
        input=""
        isAtBottom
        isSubmitting
        messages={[]}
        messagesEndRef={{ current: null }}
        onAddCollaborator={async () => {}}
        onComposerKeyDown={() => {}}
        onInputChange={() => {}}
        onRemoveCollaborator={async () => {}}
        onSubmit={() => {}}
        onTitleChange={() => {}}
        ownerName="Abel"
        ownerUserId="user-1"
        projectId="project-1"
        roadmapItems={[]}
        routeError={null}
        scrollToBottom={() => {}}
        sendError={undefined}
        summary="## Current understanding"
        visionId="vision-1"
      />,
    );

    expect(markup).not.toContain("Thinking...");
  });

  it("hides idea conversion when the viewer cannot convert ideas", () => {
    const markup = renderToStaticMarkup(
      <VisionWorkspaceView
        canConvertToIdea={false}
        canManageCollaborators
        collaborators={[]}
        composerFormRef={{ current: null }}
        composerShellRef={{ current: null }}
        contentShellRef={{ current: null }}
        currentTitle="Vision title"
        eligibleCollaborators={[]}
        input=""
        isAtBottom
        isSubmitting={false}
        messages={[]}
        messagesEndRef={{ current: null }}
        onAddCollaborator={async () => {}}
        onComposerKeyDown={() => {}}
        onInputChange={() => {}}
        onRemoveCollaborator={async () => {}}
        onSubmit={() => {}}
        onTitleChange={() => {}}
        ownerName="Abel"
        ownerUserId="user-1"
        projectId="project-1"
        roadmapItems={[]}
        routeError={null}
        scrollToBottom={() => {}}
        sendError={undefined}
        summary="## Current understanding"
        visionId="vision-1"
      />,
    );

    expect(markup).not.toContain("Create idea");
    expect(markup).toContain("Summary trigger");
  });
});
