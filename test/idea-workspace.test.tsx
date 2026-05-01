import { renderToStaticMarkup } from "react-dom/server";
import type React from "react";
import { describe, expect, it, vi } from "vite-plus/test";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock("@/app/project/[project-id]/ideas/vision-updated-at", () => ({
  VisionUpdatedAt: ({ isoString }: { isoString: string }) => <time>{isoString}</time>,
}));

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  LinkButton: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogClose: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <footer>{children}</footer>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock("@/components/ui/markdown-content", () => ({
  MarkdownContent: ({ text }: { text: string }) => <div>{text}</div>,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <aside>{children}</aside>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));

import { IdeaWorkspace } from "../components/idea/idea-workspace";

const baseIdea = {
  context: "Context",
  createdAt: "2026-04-15T10:00:00.000Z",
  createdByName: "Riley",
  id: "idea-1",
  isDone: false,
  roadmapItemId: null,
  sourceVisionId: "vision-1",
  sourceVisionTitle: "Checkout rethink",
  specSheet: "Spec",
  tasks: [],
  title: "Shared idea",
  updatedAt: "2026-04-15T10:00:00.000Z",
  userStories: [],
};

describe("IdeaWorkspace", () => {
  it("renders the task generation entry point and empty task state", () => {
    const markup = renderToStaticMarkup(
      <IdeaWorkspace idea={baseIdea} projectId="project-1" roadmapItems={[]} />,
    );

    expect(markup).toContain("Generate tasks");
    expect(markup).toContain("No tasks yet. Idea is not done.");
    expect(markup).not.toContain("Saving accepted plan");
  });

  it("renders existing tasks and subtasks for review", () => {
    const markup = renderToStaticMarkup(
      <IdeaWorkspace
        idea={{
          ...baseIdea,
          tasks: [
            {
              createdAt: "2026-04-15T10:00:00.000Z",
              dependencies: [{ id: "task-0", title: "Plan API" }],
              description: "Build the API.",
              id: "task-1",
              ideaId: "idea-1",
              isDone: false,
              metadata: { assignee: "agent" },
              position: 0,
              subtasks: [
                {
                  completedAt: null,
                  createdAt: "2026-04-15T10:00:00.000Z",
                  dependencies: [],
                  description: "Create route.",
                  id: "subtask-1",
                  isDone: false,
                  metadata: { type: "implementation" },
                  position: 0,
                  taskId: "task-1",
                  title: "Create route",
                  updatedAt: "2026-04-15T10:00:00.000Z",
                },
              ],
              title: "Build API",
              updatedAt: "2026-04-15T10:00:00.000Z",
            },
          ],
        }}
        projectId="project-1"
        roadmapItems={[]}
      />,
    );

    expect(markup).toContain("Build API");
    expect(markup).toContain("Depends on");
    expect(markup).toContain("Plan API");
    expect(markup).toContain("View");
    expect(markup).not.toContain("SubTask 1");
    expect(markup).not.toContain("Add task");
    expect(markup).toContain("Generate tasks");
  });
});
