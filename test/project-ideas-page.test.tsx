import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const { getProjectPageData, listProjectIdeas } = vi.hoisted(() => ({
  getProjectPageData: vi.fn(),
  listProjectIdeas: vi.fn(),
}));

vi.mock("../app/project/[project-id]/project-page-data", () => ({
  getProjectPageData,
}));

vi.mock("@/lib/idea/server", () => ({
  listProjectIdeas,
}));

vi.mock("@/components/ui/button", () => ({
  LinkButton: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

import ProjectIdeasPage from "../app/project/[project-id]/ideas/page";

describe("ProjectIdeasPage", () => {
  beforeEach(() => {
    getProjectPageData.mockReset();
    listProjectIdeas.mockReset();

    getProjectPageData.mockResolvedValue({
      project: {
        id: "project-1",
      },
      viewer: {
        id: "viewer-1",
      },
    });
  });

  it("renders an empty state when no ideas exist", async () => {
    listProjectIdeas.mockResolvedValue([]);

    const markup = renderToStaticMarkup(
      await ProjectIdeasPage({
        params: Promise.resolve({
          "project-id": "project-1",
        }),
      }),
    );

    expect(listProjectIdeas).toHaveBeenCalledWith("viewer-1", "project-1");
    expect(markup).toContain("Ideas");
    expect(markup).toContain("No ideas yet");
    expect(markup).toContain("/project/project-1/visions");
  });

  it("renders the project-visible ideas table", async () => {
    listProjectIdeas.mockResolvedValue([
      {
        context: "## Current understanding",
        createdAt: new Date("2026-04-15T10:00:00.000Z"),
        createdByName: "Riley",
        createdByUserId: "user-2",
        id: "idea-1",
        projectId: "project-1",
        roadmapItemId: "roadmap-1",
        roadmapItemMajorVersion: 1,
        roadmapItemMinorVersion: 2,
        roadmapItemName: "Checkout",
        sourceVisionId: "vision-1",
        sourceVisionTitle: "Checkout rethink",
        title: "Shared checkout idea",
        updatedAt: new Date("2026-04-15T10:00:00.000Z"),
      },
    ]);

    const markup = renderToStaticMarkup(
      await ProjectIdeasPage({
        params: Promise.resolve({
          "project-id": "project-1",
        }),
      }),
    );

    expect(markup).toContain("Shared checkout idea");
    expect(markup).toContain("v1.2 - Checkout");
    expect(markup).toContain("Checkout rethink");
    expect(markup).toContain("Riley");
    expect(markup).toContain("/project/project-1/ideas/idea/idea-1");
  });
});
